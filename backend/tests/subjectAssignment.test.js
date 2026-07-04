const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');
const ClassLevel = require('../src/models/ClassLevel');
const AcademicYear = require('../src/models/AcademicYear');
const Student = require('../src/models/Student');
const Subject = require('../src/models/Subject');
const SubjectAssignment = require('../src/models/SubjectAssignment');
const Grade = require('../src/models/Grade');
const StudentReport = require('../src/models/StudentReport');
const { signAccessToken } = require('../src/services/token.service');

describe('Subject & Form Teacher Assignment & Grading API', () => {
  let adminToken, teacher1Token, teacher2Token;
  let adminUser, teacher1User, teacher2User;
  let classLevel, academicYear;
  let classA, classB;
  let subjectMath, subjectScience;
  let studentA;


  beforeEach(async () => {

    await Promise.all([
      User.deleteMany({}),
      Staff.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
      Student.deleteMany({}),
      Subject.deleteMany({}),
      SubjectAssignment.deleteMany({}),
      Grade.deleteMany({}),
      StudentReport.deleteMany({}),
    ]);

    classLevel = await ClassLevel.create({
      levelCode: 'BS1',
      displayName: 'Primary 1',
      order: 1,
      category: 'Primary',
    });

    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date() }],
      isCurrent: true,
    });

    // Create staff profiles
    const staff1 = await Staff.create({
      firstName: 'Teacher',
      lastName: 'One',
      gender: 'male',
      phone: '0244111111',
      role: 'teacher',
    });

    const staff2 = await Staff.create({
      firstName: 'Teacher',
      lastName: 'Two',
      gender: 'female',
      phone: '0244222222',
      role: 'teacher',
    });

    // Create classes
    classA = await Class.create({
      level: classLevel._id,
      name: 'Primary 1A',
      academicYear: academicYear._id,
    });

    classB = await Class.create({
      level: classLevel._id,
      name: 'Primary 1B',
      academicYear: academicYear._id,
    });

    // Create subjects
    subjectMath = await Subject.create({ name: 'Mathematics', code: 'MATH101' });
    subjectScience = await Subject.create({ name: 'Science', code: 'SCI101' });

    // Create users
    adminUser = await User.create({ email: 'admin@hanara.edu.gh', phone: '0244000000', passwordHash: 'pwd', role: 'admin' });
    teacher1User = await User.create({ email: 'teacher1@hanara.edu.gh', phone: '0244111111', passwordHash: 'pwd', role: 'teacher', refStaff: staff1._id });
    teacher2User = await User.create({ email: 'teacher2@hanara.edu.gh', phone: '0244222222', passwordHash: 'pwd', role: 'teacher', refStaff: staff2._id });

    adminToken = signAccessToken({ id: adminUser._id, role: 'admin', email: adminUser.email });
    teacher1Token = signAccessToken({ id: teacher1User._id, role: 'teacher', email: teacher1User.email, refStaff: staff1._id.toString() });
    teacher2Token = signAccessToken({ id: teacher2User._id, role: 'teacher', email: teacher2User.email, refStaff: staff2._id.toString() });

    // Create student
    studentA = await Student.create({
      admissionNumber: 'HNRA/2026/0001',
      firstName: 'Student',
      lastName: 'One',
      gender: 'male',
      dob: new Date(),
      currentClass: classA._id,
    });
  });

  describe('Subject Assignments', () => {
    it('should allow admin to assign a teacher to teach a subject to a class', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacher: teacher1User._id.toString(),
          class: classA._id.toString(),
          subject: subjectMath._id.toString(),
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);

      const found = await SubjectAssignment.findOne({ teacher: teacher1User._id });
      expect(found).toBeTruthy();
    });

    it('should prevent teacher from creating assignments', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          teacher: teacher1User._id.toString(),
          class: classA._id.toString(),
          subject: subjectMath._id.toString(),
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Dynamic Grading Restriction', () => {
    beforeEach(async () => {
      // Assign teacher 1 to math in class A
      await SubjectAssignment.create({
        teacher: teacher1User._id,
        class: classA._id,
        subject: subjectMath._id,
        academicYear: '2026/2027',
        isActive: true,
      });
    });

    it('should allow assigned teacher to grade their assigned subject', async () => {
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          subjectId: subjectMath._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          classScore: 30,
          examScore: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalScore).toBe(80);
    });

    it('should block teacher from grading a subject they are not assigned to', async () => {
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          subjectId: subjectScience._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          classScore: 30,
          examScore: 50,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not assigned');
    });

    it('should allow admin to grade any subject regardless of assignment', async () => {
      const res = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          subjectId: subjectScience._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          classScore: 28,
          examScore: 60,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Form Teacher Assignments & Comments', () => {
    beforeEach(async () => {
      // Assign teacher 1 as form teacher of Class A
      await Class.findByIdAndUpdate(classA._id, { formTeacher: teacher1User._id });
    });

    it('should allow admin to assign a form teacher to a class', async () => {
      const res = await request(app)
        .patch(`/api/classes/${classB._id}/form-teacher`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formTeacherId: teacher2User._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.formTeacher._id.toString()).toBe(teacher2User._id.toString());
    });

    it('should reject assigning the same form teacher to another class in the same academic year', async () => {
      const res = await request(app)
        .patch(`/api/classes/${classB._id}/form-teacher`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formTeacherId: teacher1User._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already assigned');
    });

    it('should allow assigned form teacher to post conduct remarks', async () => {
      const res = await request(app)
        .patch('/api/grades/conduct')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          conductRemarks: 'Excellent student behavior.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conductRemarks).toBe('Excellent student behavior.');
    });

    it('should block non-form teacher from posting remarks', async () => {
      const res = await request(app)
        .patch('/api/grades/conduct')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          conductRemarks: 'Bad student behavior.',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Deactivation & Intact Grades', () => {
    let assignment;

    beforeEach(async () => {
      assignment = await SubjectAssignment.create({
        teacher: teacher1User._id,
        class: classA._id,
        subject: subjectMath._id,
        academicYear: '2026/2027',
        isActive: true,
      });

      // Teacher 1 grades math
      await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          subjectId: subjectMath._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          classScore: 28,
          examScore: 55,
        });
    });

    it('should deactivate the assignment and keep existing grade entries intact', async () => {
      // Deactivate
      const resDeact = await request(app)
        .delete(`/api/assignments/${assignment._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDeact.status).toBe(200);
      expect(resDeact.body.data.isActive).toBe(false);

      // Verify grade still exists in DB
      const grade = await Grade.findOne({
        student: studentA._id,
        subject: subjectMath._id,
        academicYear: '2026/2027',
      });
      expect(grade).toBeTruthy();
      expect(grade.totalScore).toBe(83);

      // Verify teacher 1 is now blocked from entering/updating grades for math
      const resGrade2 = await request(app)
        .post('/api/grades')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: studentA._id.toString(),
          classId: classA._id.toString(),
          subjectId: subjectMath._id.toString(),
          academicYear: '2026/2027',
          term: '1',
          classScore: 28,
          examScore: 60,
        });

      expect(resGrade2.status).toBe(403);
    });
  });

  describe('Report Card Data Separation & Retrieval', () => {
    beforeEach(async () => {
      // Setup assignments
      const sa = await SubjectAssignment.create({
        teacher: teacher1User._id,
        class: classA._id,
        subject: subjectMath._id,
        academicYear: '2026/2027',
        isActive: true,
      });

      await Class.findByIdAndUpdate(classA._id, { formTeacher: teacher2User._id });

      // Enter grade (by teacher 1)
      await Grade.create({
        student: studentA._id,
        class: classA._id,
        subject: subjectMath._id,
        subjectAssignment: sa._id,
        academicYear: '2026/2027',
        term: '1',
        classScore: 25,
        examScore: 45,
        totalScore: 70,
      });

      // Enter report remarks (by teacher 2 - form teacher)
      await StudentReport.create({
        student: studentA._id,
        class: classA._id,
        academicYear: '2026/2027',
        term: '1',
        conductRemarks: 'Very diligent.',
        attendanceSummary: { present: 45, absent: 2, total: 47 },
        promotionDecision: 'Promoted to BS2',
        formTeacher: teacher2User._id,
      });
    });

    it('should generate report card with separated subject grades and form teacher remarks', async () => {
      const res = await request(app)
        .get(`/api/grades/student/${studentA._id}/report-card?academicYear=2026/2027&term=1`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grades).toHaveLength(1);
      expect(res.body.data.grades[0].totalScore).toBe(70);
      expect(res.body.data.grades[0].subject.name).toBe('Mathematics');

      expect(res.body.data.report.conductRemarks).toBe('Very diligent.');
      expect(res.body.data.report.promotionDecision).toBe('Promoted to BS2');
      expect(res.body.data.report.attendanceSummary.present).toBe(45);
      expect(res.body.data.report.formTeacher.email).toBe('teacher2@hanara.edu.gh');
    });
  });
});
