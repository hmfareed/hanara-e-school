const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const AcademicYear = require('../src/models/AcademicYear');
const ClassLevel = require('../src/models/ClassLevel');
const Class = require('../src/models/Class');
const Student = require('../src/models/Student');
const PromotionLog = require('../src/models/PromotionLog');

describe('Academic Year Rollover & Student Promotion Engine', () => {
  let adminToken, teacherToken;
  let year2025, year2026;
  let levelP1, levelP2, levelJHS3;
  let classP1_2025, classP2_2026, classJHS3_2025;
  let student1, student2, studentJHS;

  beforeAll(async () => {
    // Clear collections
    await User.deleteMany({});
    await AcademicYear.deleteMany({});
    await ClassLevel.deleteMany({});
    await Class.deleteMany({});
    await Student.deleteMany({});
    await PromotionLog.deleteMany({});

    // 1. Create Users
    const adminUser = await User.create({
      email: 'admin.rollover@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'admin',
      isActive: true,
      approvalStatus: 'approved',
    });

    const teacherUser = await User.create({
      email: 'teacher.rollover@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'teacher',
      isActive: true,
      approvalStatus: 'approved',
    });

    // Login tokens
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin.rollover@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app).post('/api/auth/login').send({
      email: 'teacher.rollover@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    teacherToken = teacherLogin.body.data.accessToken;

    // 2. Create Academic Years
    year2025 = await AcademicYear.create({
      name: '2025/2026',
      terms: [
        { name: 'Term 1', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15') },
        { name: 'Term 2', startDate: new Date('2026-01-10'), endDate: new Date('2026-04-10') },
        { name: 'Term 3', startDate: new Date('2026-05-05'), endDate: new Date('2026-07-20') },
      ],
      isCurrent: true,
    });

    year2026 = await AcademicYear.create({
      name: '2026/2027',
      terms: [
        { name: 'Term 1', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-15') },
        { name: 'Term 2', startDate: new Date('2027-01-10'), endDate: new Date('2027-04-10') },
        { name: 'Term 3', startDate: new Date('2027-05-05'), endDate: new Date('2027-07-20') },
      ],
      isCurrent: false,
    });

    // 3. Create Class Levels
    levelP1 = await ClassLevel.create({
      levelCode: 'BS1',
      displayName: 'Primary 1',
      order: 5,
      category: 'Primary',
    });

    levelP2 = await ClassLevel.create({
      levelCode: 'BS2',
      displayName: 'Primary 2',
      order: 6,
      category: 'Primary',
    });

    levelJHS3 = await ClassLevel.create({
      levelCode: 'BS9',
      displayName: 'JHS 3',
      order: 13,
      category: 'JHS',
    });

    // 4. Create Classes
    classP1_2025 = await Class.create({
      name: 'Primary 1A',
      level: levelP1._id,
      academicYear: year2025._id,
    });

    classP2_2026 = await Class.create({
      name: 'Primary 2A',
      level: levelP2._id,
      academicYear: year2026._id,
    });

    classJHS3_2025 = await Class.create({
      name: 'JHS 3',
      level: levelJHS3._id,
      academicYear: year2025._id,
    });

    // 5. Create Students in 2025
    student1 = await Student.create({
      admissionNumber: 'HNRA/2025/0001',
      firstName: 'Kwame',
      lastName: 'Mensah',
      gender: 'male',
      dob: new Date('2018-05-12'),
      currentClass: classP1_2025._id,
      status: 'active',
    });

    student2 = await Student.create({
      admissionNumber: 'HNRA/2025/0002',
      firstName: 'Ama',
      lastName: 'Osei',
      gender: 'female',
      dob: new Date('2018-08-20'),
      currentClass: classP1_2025._id,
      status: 'active',
    });

    studentJHS = await Student.create({
      admissionNumber: 'HNRA/2025/0003',
      firstName: 'Kofi',
      lastName: 'Boateng',
      gender: 'male',
      dob: new Date('2011-03-15'),
      currentClass: classJHS3_2025._id,
      status: 'active',
    });
  });

  describe('GET /api/academic-years/rollover/preview', () => {
    it('should deny non-admin users from accessing rollover preview', async () => {
      const res = await request(app)
        .get('/api/academic-years/rollover/preview')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('should generate intelligent rollover preview with auto progression mappings', async () => {
      const res = await request(app)
        .get(`/api/academic-years/rollover/preview?fromYearId=${year2025._id}&toYearId=${year2026._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fromYear.name).toBe('2025/2026');
      expect(res.body.data.toYear.name).toBe('2026/2027');
      expect(res.body.data.stats.totalEligibleStudents).toBe(3);
      expect(res.body.data.stats.totalPromoting).toBe(2);
      expect(res.body.data.stats.totalGraduating).toBe(1);

      // Verify Primary 1 preview
      const p1Summary = res.body.data.classesSummary.find(
        (c) => c.fromClass.name === 'Primary 1A'
      );
      expect(p1Summary).toBeDefined();
      expect(p1Summary.studentCount).toBe(2);
      expect(p1Summary.suggestedAction).toBe('promoted');
      expect(p1Summary.suggestedTargetClass.name).toBe('Primary 2A');

      // Verify JHS 3 preview (graduating cohort)
      const jhsSummary = res.body.data.classesSummary.find(
        (c) => c.fromClass.name === 'JHS 3'
      );
      expect(jhsSummary).toBeDefined();
      expect(jhsSummary.isGraduatingLevel).toBe(true);
      expect(jhsSummary.suggestedAction).toBe('graduated');
    });
  });

  describe('POST /api/academic-years/rollover/execute', () => {
    it('should execute rollover with promotions, custom repeat override, and JHS 3 graduation', async () => {
      const res = await request(app)
        .post('/api/academic-years/rollover/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromYearId: year2025._id.toString(),
          toYearId: year2026._id.toString(),
          makeToYearCurrent: true,
          classMappings: [
            {
              fromClassId: classP1_2025._id.toString(),
              targetClassId: classP2_2026._id.toString(),
              action: 'promoted',
            },
          ],
          studentOverrides: [
            // Student 2 is set to repeat
            {
              studentId: student2._id.toString(),
              action: 'repeated',
              targetClassId: classP1_2025._id.toString(),
              remarks: 'Required to repeat Primary 1 due to reading assessment',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.promotedCount).toBe(1);   // Student 1
      expect(res.body.data.repeatedCount).toBe(1);   // Student 2
      expect(res.body.data.graduatedCount).toBe(1);  // Student JHS 3

      // Verify student 1 promoted to Primary 2A
      const updatedS1 = await Student.findById(student1._id);
      expect(updatedS1.currentClass.toString()).toBe(classP2_2026._id.toString());
      expect(updatedS1.status).toBe('active');

      // Verify student 2 repeated in Primary 1
      const updatedS2 = await Student.findById(student2._id);
      expect(updatedS2.currentClass.toString()).toBe(classP1_2025._id.toString());
      expect(updatedS2.status).toBe('active');

      // Verify JHS student graduated
      const updatedJHS = await Student.findById(studentJHS._id);
      expect(updatedJHS.status).toBe('graduated');
      expect(updatedJHS.currentClass).toBeNull();

      // Verify year status updated
      const updatedYear2026 = await AcademicYear.findById(year2026._id);
      expect(updatedYear2026.isCurrent).toBe(true);

      // Verify promotion audit logs created
      const logs = await PromotionLog.find({ toAcademicYear: year2026._id });
      expect(logs.length).toBe(3);
    });
  });

  describe('GET /api/academic-years/rollover/history', () => {
    it('should retrieve audit history logs for the rollover', async () => {
      const res = await request(app)
        .get(`/api/academic-years/rollover/history?toAcademicYear=${year2026._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.logs.length).toBe(3);
    });
  });
});
