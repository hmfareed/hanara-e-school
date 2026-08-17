const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const AttendanceCredential = require('../src/models/AttendanceCredential');
const AttendanceEvent = require('../src/models/AttendanceEvent');
const Student = require('../src/models/Student');
const Class = require('../src/models/Class');
const AcademicYear = require('../src/models/AcademicYear');

describe('Offline Sync & Bootstrap Layer', () => {
  let adminToken;
  let testStaff;
  let rawCredentialToken;
  let credentialHash;

  beforeEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await AttendanceCredential.deleteMany({});
    await AttendanceEvent.deleteMany({});
    await Student.deleteMany({});
    await Class.deleteMany({});
    await AcademicYear.deleteMany({});

    // Create Admin User
    const adminUser = await User.create({
      email: 'admin.offline@hanaraschools.edu.gh',
      phone: '0244111222',
      passwordHash: 'Password123!',
      role: 'admin',
      isActive: true,
    });

    // Create Staff & Credential
    rawCredentialToken = 'HAN_ATT_' + crypto.randomBytes(16).toString('hex');
    credentialHash = crypto.createHash('sha256').update(rawCredentialToken).digest('hex');

    testStaff = await Staff.create({
      userId: adminUser._id,
      firstName: 'Alhassan',
      lastName: 'Fuseini',
      staffId: 'HAN-T-001',
      role: 'teacher',
      status: 'active',
      employmentStatus: 'active',
      department: 'Science',
      phone: '0244111222',
      gender: 'male',
    });

    await AttendanceCredential.create({
      staff: testStaff._id,
      credentialHash,
      tokenPrefix: rawCredentialToken.slice(0, 12),
      status: 'ACTIVE',
      issuedAt: new Date(),
    });

    // Create Academic Year & Class Level
    const academicYear = await AcademicYear.create({
      name: '2026/2027',
      isCurrent: true,
      terms: [
        {
          name: 'Term 1',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-12-15'),
        },
      ],
    });

    const ClassLevel = require('../src/models/ClassLevel');
    await ClassLevel.deleteMany({});
    const classLevel = await ClassLevel.create({
      levelCode: 'BS6',
      displayName: 'Primary 6',
      order: 6,
      category: 'Primary',
    });

    // Create Class and Student
    const testClass = await Class.create({
      name: 'Primary 6A',
      level: classLevel._id,
      academicYear: academicYear._id,
      capacity: 35,
    });

    await Student.create({
      firstName: 'Amina',
      lastName: 'Zakaria',
      admissionNumber: 'HNRA/2026/0001',
      currentClass: testClass._id,
      status: 'active',
      gender: 'female',
      dob: new Date('2015-05-12'),
      dateOfAdmission: new Date('2022-09-01'),
      guardianName: 'Mallam Zakaria',
      guardianPhone: '0244123456',
    });

    // Login Admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.offline@hanaraschools.edu.gh', password: 'Password123!' });

    adminToken = loginRes.body.data.accessToken;
  });

  describe('GET /api/sync/bootstrap', () => {
    it('should aggregate all school data including staff credential hashes for 100% offline usage', async () => {
      const res = await request(app)
        .get('/api/sync/bootstrap')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('staff');
      expect(res.body.data).toHaveProperty('students');
      expect(res.body.data).toHaveProperty('classes');
      expect(res.body.data).toHaveProperty('serverTimestamp');

      // Verify staff contains pre-computed credential hash for offline matching
      const staffList = res.body.data.staff;
      expect(staffList.length).toBeGreaterThan(0);
      const staffMember = staffList.find((s) => s.firstName === 'Alhassan');
      expect(staffMember).toBeDefined();
      expect(staffMember.credentialHash).toBe(credentialHash);
      expect(staffMember.lastName).toBe('Fuseini');
    });

    it('should reject unauthenticated bootstrap requests', async () => {
      const res = await request(app).get('/api/sync/bootstrap');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/staff-attendance/sync', () => {
    it('should process batch offline scans and deduplicate re-synced events with eventId', async () => {
      const clientEventId = `evt_test_${Date.now()}_abc123`;
      const offlineBatch = [
        {
          eventId: clientEventId,
          credential: rawCredentialToken,
          timestamp: new Date().toISOString(),
        },
      ];

      // First sync
      const firstRes = await request(app)
        .post('/api/staff-attendance/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ events: offlineBatch });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.data.synced).toBe(1);
      expect(firstRes.body.data.duplicates).toBe(0);

      // Verify event recorded in DB
      const eventInDb = await AttendanceEvent.findOne({ eventId: clientEventId });
      expect(eventInDb).not.toBeNull();
      expect(eventInDb.staff.toString()).toBe(testStaff._id.toString());

      // Re-send same batch to test idempotent deduplication
      const duplicateRes = await request(app)
        .post('/api/staff-attendance/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ events: offlineBatch });

      expect(duplicateRes.status).toBe(200);
      expect(duplicateRes.body.data.synced).toBe(0);
      expect(duplicateRes.body.data.duplicates).toBe(1);

      // Verify count in DB is still exactly 1
      const totalEvents = await AttendanceEvent.countDocuments({ eventId: clientEventId });
      expect(totalEvents).toBe(1);
    });
  });
});
