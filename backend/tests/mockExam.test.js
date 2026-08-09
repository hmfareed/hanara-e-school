const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');
const ClassLevel = require('../src/models/ClassLevel');
const AcademicYear = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Student = require('../src/models/Student');
const SubjectAssignment = require('../src/models/SubjectAssignment');
const MockExamSeries = require('../src/models/MockExamSeries');
const MockSubjectEntry = require('../src/models/MockSubjectEntry');
const MockExamResult = require('../src/models/MockExamResult');
const MockAggregate = require('../src/models/MockAggregate');
const { signAccessToken } = require('../src/services/token.service');

describe('JHS 3 Mock Exam API & Grading Engine', () => {
  let adminToken, teacherToken, otherTeacherToken;
  let adminUser, teacherUser, otherTeacherUser;
  let jhs3Level, academicYear;
  let classJhs3;
  let studentA, studentB;
  let subjectMath, subjectEnglish, subjectBDT;
  let teacherStaff;

  beforeAll(async () => {
    // Clean up collections
    await Promise.all([
      User.deleteMany({}),
      Staff.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
      Subject.deleteMany({}),
      Student.deleteMany({}),
      SubjectAssignment.deleteMany({}),
      MockExamSeries.deleteMany({}),
      MockSubjectEntry.deleteMany({}),
      MockExamResult.deleteMany({}),
      MockAggregate.deleteMany({}),
    ]);

    // Create default JHS 3 class level
    jhs3Level = await ClassLevel.create({
      levelCode: 'BS9',
      displayName: 'JHS 3',
      order: 13,
      category: 'JHS',
    });

    // Create current Academic Year
    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date() }],
      isCurrent: true,
    });

    // Create teachers & admin
    adminUser = await User.create({
      email: 'admin@hanaraschools.edu.gh',
      passwordHash: 'hashedpassword',
      role: 'superadmin',
      isActive: true,
    });

    teacherUser = await User.create({
      email: 'teacher@hanaraschools.edu.gh',
      passwordHash: 'hashedpassword',
      role: 'teacher',
      isActive: true,
    });

    otherTeacherUser = await User.create({
      email: 'other@hanaraschools.edu.gh',
      passwordHash: 'hashedpassword',
      role: 'teacher',
      isActive: true,
    });

    teacherStaff = await Staff.create({
      userId: teacherUser._id,
      firstName: 'Alhassan',
      lastName: 'Fuseini',
      gender: 'male',
      phone: '0244111222',
      role: 'teacher',
      employmentStatus: 'active',
    });

    // Link staff to user
    teacherUser.personRef = teacherStaff._id;
    await teacherUser.save();

    // Create Class JHS 3A
    classJhs3 = await Class.create({
      level: jhs3Level._id,
      name: 'JHS 3A',
      academicYear: academicYear._id,
      classTeacher: teacherStaff._id,
    });

    // Create core & elective subjects
    subjectMath = await Subject.create({ name: 'Mathematics', code: 'MATH9' });
    subjectEnglish = await Subject.create({ name: 'English Language', code: 'ENG9' });
    subjectBDT = await Subject.create({ name: 'Basic Design and Technology', code: 'BDT9' });

    // Create students in class JHS 3A
    studentA = await Student.create({
      firstName: 'Abdul',
      lastName: 'Rahman',
      admissionNumber: 'HNRA/2026/0001',
      currentClass: classJhs3._id,
      status: 'active',
      gender: 'male',
      dob: new Date('2012-05-15'),
    });

    studentB = await Student.create({
      firstName: 'Fatima',
      lastName: 'Abu',
      admissionNumber: 'HNRA/2026/0002',
      currentClass: classJhs3._id,
      status: 'active',
      gender: 'female',
      dob: new Date('2012-09-20'),
    });

    // Assign teacherfuseini to teach English and BDT
    await SubjectAssignment.create({
      teacher: teacherUser._id,
      class: classJhs3._id,
      subject: subjectEnglish._id,
      academicYear: academicYear._id,
      isActive: true,
    });

    await SubjectAssignment.create({
      teacher: teacherUser._id,
      class: classJhs3._id,
      subject: subjectBDT._id,
      academicYear: academicYear._id,
      isActive: true,
    });

    // Sign Access Tokens
    adminToken = signAccessToken({ id: adminUser._id, role: adminUser.role });
    teacherToken = signAccessToken({ id: teacherUser._id, role: teacherUser.role });
    otherTeacherToken = signAccessToken({ id: otherTeacherUser._id, role: otherTeacherUser.role });
  });

  describe('Series Management (Admin/HT Scoped)', () => {
    let seriesId;

    it('should block non-admin from creating series', async () => {
      const res = await request(app)
        .post('/api/mock-exams/series')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: 'Mock 1',
          academicYear: '2026/2027',
          order: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin to create a series', async () => {
      const res = await request(app)
        .post('/api/mock-exams/series')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mock 1',
          academicYear: '2026/2027',
          order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Mock 1');
      seriesId = res.body.data._id;
    });

    it('should list all series', async () => {
      const res = await request(app)
        .get('/api/mock-exams/series')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Teacher Score Entry & Draft Saving', () => {
    let series;
    let entryId;

    beforeAll(async () => {
      series = await MockExamSeries.findOne({ name: 'Mock 1' });
    });

    it('should list teacher assigned JHS 3 entries', async () => {
      const res = await request(app)
        .get(`/api/mock-exams/${series._id}/my-entries`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2); // English and BDT
    });

    it('should generate/load a new entry and student list for English', async () => {
      const res = await request(app)
        .get(`/api/mock-exams/${series._id}/entries/new/scores`)
        .query({ classId: classJhs3._id.toString(), subjectId: subjectEnglish._id.toString() })
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rows).toHaveLength(2); // 2 students
      expect(res.body.data.entry.isCore).toBe(true); // English is core
      entryId = res.body.data.entry._id;
    });

    it('should allow teacher to bulk save scores as draft', async () => {
      const res = await request(app)
        .post(`/api/mock-exams/${series._id}/entries/${entryId}/scores`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          scores: [
            { studentId: studentA._id, rawScore: 85 }, // expected grade: 2
            { studentId: studentB._id, rawScore: 92 }, // expected grade: 1
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enteredCount).toBe(2);

      // Verify records written
      const results = await MockExamResult.find({ seriesId: series._id, subjectEntryId: entryId });
      expect(results).toHaveLength(2);
      const resA = results.find((r) => r.studentId.toString() === studentA._id.toString());
      expect(resA.rawScore).toBe(85);
      expect(resA.grade).toBe(2);
    });

    it('should block non-assigned teachers from saving scores', async () => {
      const res = await request(app)
        .post(`/api/mock-exams/${series._id}/entries/${entryId}/scores`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({
          scores: [
            { studentId: studentA._id, rawScore: 70 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Score Submission & Reopen Action', () => {
    let series, entry;

    beforeAll(async () => {
      series = await MockExamSeries.findOne({ name: 'Mock 1' });
      entry = await MockSubjectEntry.findOne({ seriesId: series._id, subjectId: subjectEnglish._id });
    });

    it('should allow assigned teacher to submit the scores entry', async () => {
      const res = await request(app)
        .patch(`/api/mock-exams/${series._id}/entries/${entry._id}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedEntry = await MockSubjectEntry.findById(entry._id);
      expect(updatedEntry.status).toBe('submitted');
    });

    it('should prevent teacher from saving scores after submission (locked)', async () => {
      const res = await request(app)
        .post(`/api/mock-exams/${series._id}/entries/${entry._id}/scores`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          scores: [
            { studentId: studentA._id, rawScore: 99 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });

    it('should block teacher from self-reopening', async () => {
      const res = await request(app)
        .patch(`/api/mock-exams/${series._id}/entries/${entry._id}/reopen`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ reason: 'Teacher typo error' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin to reopen a submitted entry', async () => {
      const res = await request(app)
        .patch(`/api/mock-exams/${series._id}/entries/${entry._id}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Correction needed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedEntry = await MockSubjectEntry.findById(entry._id);
      expect(updatedEntry.status).toBe('reopened');
    });
  });

  describe('Aggregates, Submission Matrix, and PDF Slips', () => {
    let series;

    beforeAll(async () => {
      series = await MockExamSeries.findOne({ name: 'Mock 1' });
    });

    it('should return submission matrix for Admin', async () => {
      const res = await request(app)
        .get(`/api/mock-exams/${series._id}/matrix`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return student result details', async () => {
      const res = await request(app)
        .get(`/api/mock-exams/${series._id}/students/${studentA._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeDefined();
    });

    it('should retrieve class grades grid for class', async () => {
      const res = await request(app)
        .get(`/api/mock-exams/${series._id}/classes/${classJhs3._id}/grades-grid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rows).toBeDefined();
      expect(res.body.data.subjects).toBeDefined();
    });
  });
});
