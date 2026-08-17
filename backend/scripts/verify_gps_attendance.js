require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const User = require('../src/models/User');
const StaffAttendanceRecord = require('../src/models/StaffAttendanceRecord');
const AttendanceEvent = require('../src/models/AttendanceEvent');
const SystemSetting = require('../src/models/SystemSetting');
const {
  checkIn,
  checkOut,
  getAdminDailyOverview,
  getGeofenceSettingsHandler,
} = require('../src/controllers/staffAttendance.controller');

// Reference Coordinates for Tamale, Ghana
const ZOGBELI_LAT = 9.4075;
const ZOGBELI_LNG = -0.8392;
const VITTIN_LAT = 9.385;
const VITTIN_LNG = -0.812;

async function runVerification() {
  console.log('\n======================================================');
  console.log('  STARTING GPS GEOFENCE & ATTENDANCE VERIFICATION');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[DB] Connected to MongoDB database.');

  // Clean test records for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // 1. Setup / update geofence configuration to 150m
  await SystemSetting.findOneAndUpdate(
    { key: 'staff_attendance_geofence' },
    {
      $set: {
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
      },
    },
    { upsert: true, new: true }
  );
  console.log('[1/5] Geofence settings configured with 150m radius for Zogbeli and Vittin branches.');

  // 2. Find or create a test teacher staff & user
  let teacherStaff = await Staff.findOne({ email: 'test.teacher.gps@hanara.edu.gh' });
  if (!teacherStaff) {
    teacherStaff = await Staff.create({
      firstName: 'Mohammed',
      lastName: 'Ibrahim',
      gender: 'male',
      staffId: 'HAN-GPS-001',
      employmentStatus: 'active',
      email: 'test.teacher.gps@hanara.edu.gh',
      phone: '0244998877',
      role: 'teacher',
      department: 'Mathematics',
      branch: 'Zogbeli',
    });
  }

  let teacherUser = await User.findOne({ email: 'test.teacher.gps@hanara.edu.gh' });
  if (!teacherUser) {
    teacherUser = await User.create({
      email: 'test.teacher.gps@hanara.edu.gh',
      phone: '0244998877',
      passwordHash: 'dummyhash',
      role: 'teacher',
      refStaff: teacherStaff._id,
    });
  }

  // Remove existing today record for clean test
  await StaffAttendanceRecord.deleteMany({
    staff: teacherStaff._id,
    date: { $gte: today, $lt: tomorrow },
  });

  // Mock Socket.io
  const mockIo = {
    events: [],
    emit: function (name, data) {
      this.events.push({ name, data });
      console.log(`  -> [Socket.io Event Emitted] "${name}" for ${data.staffName || data.staffId}`);
    },
  };

  const app = {
    get: (key) => (key === 'io' ? mockIo : null),
  };

  // Helper response builder
  function buildRes() {
    return {
      statusCode: 200,
      body: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        this.body = payload;
        return this;
      },
    };
  }

  // ── TEST 1: Check-in far outside 150m (Should be rejected 403) ─────────────
  console.log('\n--- TEST 1: Check-in outside 150m radius (5km away) ---');
  const reqFar = {
    user: { id: teacherUser._id, refStaff: teacherStaff._id, role: 'teacher' },
    body: { lat: ZOGBELI_LAT + 0.045, lng: ZOGBELI_LNG + 0.045, branch: 'Zogbeli' },
    app,
    ip: '127.0.0.1',
  };
  const resFar = buildRes();
  await checkIn(reqFar, resFar, (err) => console.error('Error:', err));

  console.log(`Result Status: ${resFar.statusCode}`);
  console.log(`Response: ${JSON.stringify(resFar.body)}`);
  if (resFar.statusCode === 403 && resFar.body.success === false) {
    console.log('PASS: Correctly rejected check-in outside 150m radius.');
  } else {
    console.error('FAIL: Should have rejected check-in outside 150m.');
  }

  // ── TEST 2: Check-in inside 150m (Should succeed 200) ───────────────────────
  console.log('\n--- TEST 2: Check-in within 150m radius (~30m from campus) ---');
  const reqClose = {
    user: { id: teacherUser._id, refStaff: teacherStaff._id, role: 'teacher' },
    body: { lat: ZOGBELI_LAT + 0.0002, lng: ZOGBELI_LNG + 0.0002, branch: 'Zogbeli' },
    app,
    ip: '127.0.0.1',
  };
  const resClose = buildRes();
  await checkIn(reqClose, resClose, (err) => console.error('Error:', err));

  console.log(`Result Status: ${resClose.statusCode}`);
  console.log(`Message: ${resClose.body?.message}`);
  console.log(`Geofence Verified: ${resClose.body?.data?.geofenceVerified}`);
  console.log(`Distance Recorded: ${resClose.body?.data?.distanceFromSchool}m`);
  console.log(`Check-In Time: ${resClose.body?.data?.checkInTime}`);
  if (resClose.statusCode === 200 && resClose.body?.data?.geofenceVerified === true) {
    console.log('PASS: Check-in within 150m verified and accepted successfully.');
  } else {
    console.error('FAIL: Check-in within 150m was not accepted.');
  }

  // ── TEST 3: Duplicate Check-in (Should be 409 Conflict) ────────────────────
  console.log('\n--- TEST 3: Duplicate Check-in on same day ---');
  const resDup = buildRes();
  await checkIn(reqClose, resDup, (err) => console.error('Error:', err));
  console.log(`Result Status: ${resDup.statusCode}`);
  console.log(`Message: ${resDup.body?.message}`);
  if (resDup.statusCode === 409) {
    console.log('PASS: Duplicate check-in correctly blocked with 409 Conflict.');
  } else {
    console.error('FAIL: Duplicate check-in was not blocked.');
  }

  // ── TEST 4: Teacher Check-Out ──────────────────────────────────────────────
  console.log('\n--- TEST 4: Teacher Check-Out ---');
  const reqOut = {
    user: { id: teacherUser._id, refStaff: teacherStaff._id, role: 'teacher' },
    body: {},
    app,
    ip: '127.0.0.1',
  };
  const resOut = buildRes();
  await checkOut(reqOut, resOut, (err) => console.error('Error:', err));

  console.log(`Result Status: ${resOut.statusCode}`);
  console.log(`Message: ${resOut.body?.message}`);
  console.log(`Check-Out Time: ${resOut.body?.data?.checkOutTime}`);
  console.log(`Check-Out Status: ${resOut.body?.data?.checkOutStatus}`);
  if (resOut.statusCode === 200 && resOut.body?.data?.checkOutTime) {
    console.log('PASS: Check-out recorded and socket broadcast emitted.');
  } else {
    console.error('FAIL: Check-out failed.');
  }

  // ── TEST 5: Admin Daily Overview ──────────────────────────────────────────
  console.log('\n--- TEST 5: Admin Daily Overview Verification ---');
  const reqAdmin = {
    query: { date: today.toISOString().split('T')[0], branch: 'all' },
  };
  const resAdmin = buildRes();
  await getAdminDailyOverview(reqAdmin, resAdmin, (err) => console.error('Error:', err));

  const teacherOverview = resAdmin.body?.data?.overview?.find(
    (o) => o.staffId.toString() === teacherStaff._id.toString()
  );

  console.log('Admin View for Teacher:');
  console.log(`  Name: ${teacherOverview?.name}`);
  console.log(`  Branch: ${teacherOverview?.branch}`);
  console.log(`  Check-In: ${teacherOverview?.checkInTime}`);
  console.log(`  Check-Out: ${teacherOverview?.checkOutTime}`);
  console.log(`  Status: ${teacherOverview?.status}`);
  console.log(`  GPS Verified: ${teacherOverview?.geofenceVerified}`);
  console.log(`  Distance from Campus: ${teacherOverview?.distanceFromSchool}m`);

  if (
    teacherOverview &&
    teacherOverview.checkInTime &&
    teacherOverview.checkOutTime &&
    teacherOverview.geofenceVerified === true
  ) {
    console.log('PASS: Admin daily overview displays complete check-in, check-out, time, GPS, and distance data.');
  } else {
    console.error('FAIL: Admin overview did not reflect complete attendance data.');
  }

  // Clean test record
  await StaffAttendanceRecord.deleteMany({
    staff: teacherStaff._id,
    date: { $gte: today, $lt: tomorrow },
  });

  await mongoose.disconnect();
  console.log('\n======================================================');
  console.log('  ALL GPS ATTENDANCE BACKEND TESTS COMPLETED');
  console.log('======================================================\n');
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
