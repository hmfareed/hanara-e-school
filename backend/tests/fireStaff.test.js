const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');
const Bus = require('../src/models/Bus');
const ClassSubjectAssignment = require('../src/models/ClassSubjectAssignment');
const ClassLevel = require('../src/models/ClassLevel');
const AcademicYear = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const { signAccessToken } = require('../src/services/token.service');

describe('Fire/Sack Staff Member API', () => {
  let superadminToken, adminToken, teacherToken;
  let superadminUser, adminUser, teacherUser, targetStaff, academicYear, classLevel, testClass, testBus, testSubject, testAssignment;

  beforeAll(async () => {
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Class.deleteMany({});
    await Bus.deleteMany({});
    await ClassSubjectAssignment.deleteMany({});
    await ClassLevel.deleteMany({});
    await AcademicYear.deleteMany({});
    await Subject.deleteMany({});

    // Seed academic year and class level
    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date() }],
      isCurrent: true,
    });

    classLevel = await ClassLevel.create({
      levelCode: 'BS1',
      displayName: 'Primary 1',
      order: 1,
      category: 'Primary',
    });

    testSubject = await Subject.create({
      name: 'Mathematics',
      code: 'MATH101',
      type: 'subject',
      appliesToLevels: [classLevel._id],
    });

    // Create staff profiles
    const superadminStaff = await Staff.create({
      firstName: 'Head',
      lastName: 'Teacher',
      email: 'head@hanara.edu.gh',
      role: 'admin',
      gender: 'male',
      phone: '0241000000',
    });

    const adminStaff = await Staff.create({
      firstName: 'Admin',
      lastName: 'Staff',
      email: 'admin@hanara.edu.gh',
      role: 'admin',
      gender: 'male',
      phone: '0242000000',
    });

    targetStaff = await Staff.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@hanara.edu.gh',
      role: 'teacher',
      gender: 'male',
      phone: '0243000000',
    });

    // Create user profiles
    superadminUser = await User.create({
      email: 'head@hanara.edu.gh',
      phone: '0241000000',
      passwordHash: 'pwd',
      role: 'superadmin',
      refStaff: superadminStaff._id,
    });

    adminUser = await User.create({
      email: 'admin@hanara.edu.gh',
      phone: '0242000000',
      passwordHash: 'pwd',
      role: 'admin',
      refStaff: adminStaff._id,
    });

    teacherUser = await User.create({
      email: 'john.doe@hanara.edu.gh',
      phone: '0243000000',
      passwordHash: 'pwd',
      role: 'teacher',
      refStaff: targetStaff._id,
    });

    // Create class and bus references
    testClass = await Class.create({
      level: classLevel._id,
      name: 'Class 1A',
      academicYear: academicYear._id,
      classTeacher: targetStaff._id,
      formTeacher: teacherUser._id,
    });

    testBus = await Bus.create({
      plateNumber: 'GS-1234-26',
      capacity: 30,
      driver: targetStaff._id,
    });

    testAssignment = await ClassSubjectAssignment.create({
      class: testClass._id,
      subject: testSubject._id,
      teacher: targetStaff._id,
      academicYear: academicYear._id,
    });

    // Generate tokens
    superadminToken = signAccessToken({ id: superadminUser._id, role: 'superadmin', email: superadminUser.email });
    adminToken = signAccessToken({ id: adminUser._id, role: 'admin', email: adminUser.email });
    teacherToken = signAccessToken({ id: teacherUser._id, role: 'teacher', email: teacherUser.email });
  });

  afterAll(async () => {
  });

  it('should block non-superadmin users from firing staff', async () => {
    const res = await request(app)
      .delete(`/api/staff/${targetStaff._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(403);
  });

  it('should block a superadmin from firing themselves', async () => {
    const res = await request(app)
      .delete(`/api/staff/${superadminUser.refStaff}`)
      .set('Authorization', `Bearer ${superadminToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cannot fire yourself');
  });

  it('should block firing another superadmin staff member', async () => {
    // Create another superadmin user & staff
    const superadmin2Staff = await Staff.create({
      firstName: 'Other',
      lastName: 'Head',
      email: 'head2@hanara.edu.gh',
      role: 'admin',
      gender: 'male',
      phone: '0241000002',
    });
    await User.create({
      email: 'head2@hanara.edu.gh',
      phone: '0241000002',
      passwordHash: 'pwd',
      role: 'superadmin',
      refStaff: superadmin2Staff._id,
    });

    const res = await request(app)
      .delete(`/api/staff/${superadmin2Staff._id}`)
      .set('Authorization', `Bearer ${superadminToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cannot fire the headteacher');
  });

  it('should successfully fire a staff member and clean up references', async () => {
    const res = await request(app)
      .delete(`/api/staff/${targetStaff._id}`)
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 1. Verify Staff profile deleted
    const staffCheck = await Staff.findById(targetStaff._id);
    expect(staffCheck).toBeNull();

    // 2. Verify associated User deleted
    const userCheck = await User.findById(teacherUser._id);
    expect(userCheck).toBeNull();

    // 3. Verify Class teacher references cleared
    const classCheck = await Class.findById(testClass._id);
    expect(classCheck.classTeacher).toBeNull();
    expect(classCheck.formTeacher).toBeNull();

    // 4. Verify Bus driver references cleared
    const busCheck = await Bus.findById(testBus._id);
    expect(busCheck.driver).toBeNull();

    // 5. Verify ClassSubjectAssignments deleted
    const assignmentCheck = await ClassSubjectAssignment.findById(testAssignment._id);
    expect(assignmentCheck).toBeNull();
  });
});
