const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const SystemSetting = require('../src/models/SystemSetting');
const StaffAttendanceRecord = require('../src/models/StaffAttendanceRecord');
const AttendanceEvent = require('../src/models/AttendanceEvent');
const { signAccessToken } = require('../src/services/token.service');

describe('GPS Geofence Staff Attendance & Check-In/Check-Out Tests', () => {
  let adminUser, adminToken;
  let teacherUser, teacherStaff, teacherToken;

  // Reference coordinates for testing (Tamale, Ghana)
  const ZOGBELI_LAT = 9.4075;
  const ZOGBELI_LNG = -0.8392;
  const VITTIN_LAT = 9.385;
  const VITTIN_LNG = -0.812;

  beforeAll(async () => {
    await StaffAttendanceRecord.deleteMany({});
    await AttendanceEvent.deleteMany({});
    await Staff.deleteMany({});
    await User.deleteMany({});
    await SystemSetting.deleteMany({});

    // Setup Admin User
    adminUser = await User.create({
      email: 'admin.att@hanara.edu.gh',
      phone: '0244009988',
      passwordHash: 'hashedpwd',
      role: 'admin',
    });
    adminToken = signAccessToken({ id: adminUser._id, role: 'admin', email: adminUser.email });

    // Setup Teacher Staff & User
    teacherStaff = await Staff.create({
      firstName: 'Alhassan',
      lastName: 'Mohammed',
      gender: 'male',
      phone: '0244112233',
      staffId: 'HAN-2026-T01',
      employmentStatus: 'active',
      role: 'teacher',
      department: 'Science',
      branch: 'Zogbeli',
    });

    teacherUser = await User.create({
      email: 'alhassan.t@hanara.edu.gh',
      phone: '0244112233',
      passwordHash: 'hashedpwd',
      role: 'teacher',
      refStaff: teacherStaff._id,
    });
    teacherToken = signAccessToken({
      id: teacherUser._id,
      role: 'teacher',
      email: teacherUser.email,
      refStaff: teacherStaff._id.toString(),
    });

    // Configure Dual-Branch Geofence in SystemSettings (150m radius)
    await SystemSetting.create({
      key: 'staff_attendance_geofence',
      value: {
        enabled: true,
        radiusMetres: 150,
        lateThresholdMinutes: 15,
        zogbeli: {
          name: 'Zogbeli Branch',
          lat: ZOGBELI_LAT,
          lng: ZOGBELI_LNG,
          radiusMetres: 150,
        },
        vittin: {
          name: 'Vittin Branch',
          lat: VITTIN_LAT,
          lng: VITTIN_LNG,
          radiusMetres: 150,
        },
      },
      valueType: 'json',
      category: 'academic',
    });
  });

  afterAll(async () => {
    await StaffAttendanceRecord.deleteMany({});
    await AttendanceEvent.deleteMany({});
    await Staff.deleteMany({});
    await User.deleteMany({});
    await SystemSetting.deleteMany({});
  });

  describe('1. GPS Geofence Settings Endpoint', () => {
    it('should allow staff to fetch geofence settings', async () => {
      const res = await request(app)
        .get('/api/staff-attendance/geofence-settings')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enabled).toBe(true);
      expect(res.body.data.zogbeli.lat).toBe(ZOGBELI_LAT);
      expect(res.body.data.zogbeli.radiusMetres).toBe(150);
      expect(res.body.data.vittin.lat).toBe(VITTIN_LAT);
      expect(res.body.data.vittin.radiusMetres).toBe(150);
    });

    it('should allow admin to update geofence settings', async () => {
      const res = await request(app)
        .patch('/api/staff-attendance/geofence-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enabled: true,
          radiusMetres: 150,
          zogbeli: { lat: ZOGBELI_LAT, lng: ZOGBELI_LNG, radiusMetres: 150 },
          vittin: { lat: VITTIN_LAT, lng: VITTIN_LNG, radiusMetres: 150 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zogbeli.radiusMetres).toBe(150);
    });
  });

  describe('2. Geofenced Check-In & 150M Boundary Verification', () => {
    it('should reject check-in when teacher is far outside 150m radius (e.g. 5km away)', async () => {
      // 5km away: lat offset by +0.05
      const farLat = ZOGBELI_LAT + 0.05;
      const farLng = ZOGBELI_LNG + 0.05;

      const res = await request(app)
        .post('/api/staff-attendance/check-in')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lat: farLat,
          lng: farLng,
          branch: 'Zogbeli',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Location check failed.*away from Zogbeli Branch/i);
      expect(res.body.distanceFromSchool).toBeGreaterThan(150);
    });

    it('should accept check-in when teacher is inside 150m radius (e.g. ~20m from branch center)', async () => {
      // ~20m offset: lat offset by 0.00018
      const closeLat = ZOGBELI_LAT + 0.00018;
      const closeLng = ZOGBELI_LNG + 0.00018;

      const res = await request(app)
        .post('/api/staff-attendance/check-in')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lat: closeLat,
          lng: closeLng,
          branch: 'Zogbeli',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.checkInTime).toBeDefined();
      expect(res.body.data.geofenceVerified).toBe(true);
      expect(res.body.data.distanceFromSchool).toBeLessThanOrEqual(150);
      expect(res.body.data.branch).toBe('Zogbeli');
    });

    it('should reject duplicate check-in if teacher already checked in today', async () => {
      const closeLat = ZOGBELI_LAT + 0.0001;
      const closeLng = ZOGBELI_LNG + 0.0001;

      const res = await request(app)
        .post('/api/staff-attendance/check-in')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lat: closeLat,
          lng: closeLng,
          branch: 'Zogbeli',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already checked in today/i);
    });
  });

  describe('3. Check-Out Verification', () => {
    it('should allow teacher to check out after check-in', async () => {
      const res = await request(app)
        .post('/api/staff-attendance/check-out')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOutTime).toBeDefined();
      expect(res.body.data.checkOutStatus).toBe('CHECKED_OUT');
      expect(res.body.message).toMatch(/Checked out successfully/i);
    });

    it('should reject duplicate check-out if teacher already checked out', async () => {
      const res = await request(app)
        .post('/api/staff-attendance/check-out')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send();

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already checked out today/i);
    });
  });

  describe('4. Admin Daily Overview & Monitoring', () => {
    it('should return teacher check-in time, check-out time, branch, GPS status, and distance for Admin', async () => {
      const res = await request(app)
        .get('/api/staff-attendance/admin/daily')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.summary).toBeDefined();

      const teacherRecord = res.body.data.overview.find(
        (o) => o.staffId.toString() === teacherStaff._id.toString()
      );

      expect(teacherRecord).toBeDefined();
      expect(teacherRecord.name).toBe('Alhassan Mohammed');
      expect(teacherRecord.branch).toBe('Zogbeli');
      expect(teacherRecord.checkInTime).toBeDefined();
      expect(teacherRecord.checkOutTime).toBeDefined();
      expect(teacherRecord.geofenceVerified).toBe(true);
      expect(teacherRecord.distanceFromSchool).toBeLessThanOrEqual(150);
    });
  });
});
