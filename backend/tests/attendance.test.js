const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');
const ClassLevel = require('../src/models/ClassLevel');
const AcademicYear = require('../src/models/AcademicYear');
const Student = require('../src/models/Student');
const AttendanceRecord = require('../src/models/AttendanceRecord');
const { signAccessToken } = require('../src/services/token.service');

describe('Attendance API & authorization', () => {
  let adminToken, teacherToken, otherTeacherToken;
  let adminUser, teacherUser, otherTeacherUser;
  let classLevel, academicYear;
  let classA, classB;
  let studentA, studentB;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    await Promise.all([
      User.deleteMany({}),
      Staff.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
      Student.deleteMany({}),
      AttendanceRecord.deleteMany({}),
    ]);

    classLevel = await ClassLevel.create({ levelCode: 'BS1', displayName: 'Primary 1', order: 1, category: 'Primary' });
    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date() }],
      isCurrent: true,
    });

    const staff1 = await Staff.create({
      firstName: 'Mariam',
      lastName: 'Issah',
      gender: 'female',
      phone: '0244111222',
      role: 'teacher',
      employmentStatus: 'active',
    });

    const staff2 = await Staff.create({
      firstName: 'Other',
      lastName: 'Teacher',
      gender: 'male',
      phone: '0244333444',
      role: 'teacher',
      employmentStatus: 'active',
    });

    classA = await Class.create({ level: classLevel._id, name: 'Primary 1A', academicYear: academicYear._id, classTeacher: staff1._id });
    classB = await Class.create({ level: classLevel._id, name: 'Primary 1B', academicYear: academicYear._id, classTeacher: staff2._id });

    staff1.classesAssigned = [classA._id];
    await staff1.save();
    staff2.classesAssigned = [classB._id];
    await staff2.save();

    adminUser = await User.create({ email: 'admin@hanara.edu.gh', phone: '0244000000', passwordHash: 'pwd', role: 'admin' });
    teacherUser = await User.create({ email: 'mariam@hanara.edu.gh', phone: '0244111222', passwordHash: 'pwd', role: 'teacher', refStaff: staff1._id });
    otherTeacherUser = await User.create({ email: 'other@hanara.edu.gh', phone: '0244333444', passwordHash: 'pwd', role: 'teacher', refStaff: staff2._id });

    adminToken = signAccessToken({ id: adminUser._id, role: 'admin', email: adminUser.email });
    teacherToken = signAccessToken({ id: teacherUser._id, role: 'teacher', email: teacherUser.email, refStaff: staff1._id.toString() });
    otherTeacherToken = signAccessToken({ id: otherTeacherUser._id, role: 'teacher', email: otherTeacherUser.email, refStaff: staff2._id.toString() });

    studentA = await Student.create({ admissionNumber: 'HNRA/2026/0001', firstName: 'Student', lastName: 'A', gender: 'male', dob: new Date(), currentClass: classA._id });
    studentB = await Student.create({ admissionNumber: 'HNRA/2026/0002', firstName: 'Student', lastName: 'B', gender: 'female', dob: new Date(), currentClass: classB._id });
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({}),
      Staff.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
      Student.deleteMany({}),
      AttendanceRecord.deleteMany({}),
    ]);
    await mongoose.connection.close();
  });

  describe('GET /api/attendance', () => {
    it('should allow teacher to get class register for their assigned class', async () => {
      const res = await request(app)
        .get(`/api/attendance?class=${classA._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.register).toHaveLength(1);
      expect(res.body.data.register[0].student._id.toString()).toBe(studentA._id.toString());
    });

    it('should block teacher from getting register for another class', async () => {
      const res = await request(app)
        .get(`/api/attendance?class=${classB._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission');
    });

    it('should allow admin to get register for any class', async () => {
      const res = await request(app)
        .get(`/api/attendance?class=${classB._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/attendance/bulk', () => {
    it('should allow teacher to bulk mark attendance for their class', async () => {
      const res = await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classId: classA._id.toString(),
          date: new Date().toISOString(),
          termId: academicYear.terms[0]._id.toString(),
          records: [
            { studentId: studentA._id.toString(), status: 'present', notes: 'All good' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block teacher from bulk marking another class', async () => {
      const res = await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classId: classB._id.toString(),
          date: new Date().toISOString(),
          termId: academicYear.terms[0]._id.toString(),
          records: [
            { studentId: studentB._id.toString(), status: 'present' }
          ]
        });

      expect(res.status).toBe(403);
    });
  });
});
