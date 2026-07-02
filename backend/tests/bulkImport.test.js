const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Guardian = require('../src/models/Guardian');
const Class = require('../src/models/Class');
const ClassLevel = require('../src/models/ClassLevel');
const AcademicYear = require('../src/models/AcademicYear');
const { signAccessToken } = require('../src/services/token.service');

describe('Bulk Student Onboarding API', () => {
  let adminToken;
  let classLevel;
  let academicYear;
  let classA;
  let classB;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
    ]);

    // Create Academic Year and Classes
    classLevel = await ClassLevel.create({ levelCode: 'BS1', displayName: 'Primary 1', order: 1, category: 'Primary' });
    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date() }],
      isCurrent: true,
    });

    classA = await Class.create({ level: classLevel._id, name: 'Primary 1A', academicYear: academicYear._id });
    classB = await Class.create({ level: classLevel._id, name: 'Primary 1B', academicYear: academicYear._id });

    // Admin user setup
    const adminUser = await User.create({
      email: 'superadmin@hanara.edu.gh',
      phone: '0241000000',
      passwordHash: 'pwd',
      role: 'superadmin',
    });

    adminToken = signAccessToken({ id: adminUser._id, role: 'superadmin', email: adminUser.email });
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Guardian.deleteMany({}),
      Class.deleteMany({}),
      ClassLevel.deleteMany({}),
      AcademicYear.deleteMany({}),
    ]);
    await mongoose.connection.close();
  });

  describe('POST /api/students/bulk', () => {
    it('should block unauthorized requests', async () => {
      const res = await request(app)
        .post('/api/students/bulk')
        .send([]);
      expect(res.status).toBe(401);
    });

    it('should successfully bulk import students and match guardians/siblings', async () => {
      const payload = [
        {
          firstName: 'Amara',
          lastName: 'Kofi',
          otherNames: 'Efua',
          gender: 'female',
          dob: '2016-04-12',
          className: 'Primary 1A',
          medicalNotes: 'Peanut allergy',
          guardian: {
            firstName: 'Kojo',
            lastName: 'Kofi',
            relationship: 'father',
            phone: '0241112222',
            email: 'kojo@example.com',
            address: '123 Tamale St',
            consentDataProcessing: { granted: true }
          }
        },
        {
          firstName: 'Yaw',
          lastName: 'Kofi',
          gender: 'male',
          dob: '2018-09-22',
          className: 'Primary 1A',
          guardian: {
            firstName: 'Kojo',
            lastName: 'Kofi',
            relationship: 'father',
            phone: '0241112222', // Same parent phone - sibling!
            email: 'kojo@example.com',
            address: '123 Tamale St',
            consentDataProcessing: { granted: true }
          }
        },
        {
          firstName: 'Abena',
          lastName: 'Mensah',
          gender: 'female',
          dob: '2017-01-15',
          className: 'Primary 1B',
          guardian: {
            firstName: 'Akua',
            lastName: 'Mensah',
            relationship: 'mother',
            phone: '0277333444', // Different parent
            email: 'akua@example.com',
            address: '456 Tamale St',
            consentDataProcessing: { granted: true }
          }
        }
      ];

      const res = await request(app)
        .post('/api/students/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentsCount).toBe(3);
      expect(res.body.data.newGuardiansCount).toBe(2);

      // Check DB records
      const students = await Student.find({}).populate('guardians');
      expect(students.length).toBe(3);

      const amara = students.find(s => s.firstName === 'Amara');
      const yaw = students.find(s => s.firstName === 'Yaw');
      const abena = students.find(s => s.firstName === 'Abena');

      // Verify admission numbers generated sequentially
      expect(amara.admissionNumber).toBeDefined();
      expect(yaw.admissionNumber).toBeDefined();
      expect(abena.admissionNumber).toBeDefined();
      const currentYear = new Date().getFullYear();
      expect(amara.admissionNumber).toBe(`HNRA/${currentYear}/0001`);
      expect(yaw.admissionNumber).toBe(`HNRA/${currentYear}/0002`);
      expect(abena.admissionNumber).toBe(`HNRA/${currentYear}/0003`);

      // Verify sibling linking
      expect(amara.guardians[0]._id.toString()).toBe(yaw.guardians[0]._id.toString());
      expect(amara.guardians[0].firstName).toBe('Kojo');

      // Verify class mapping
      expect(amara.currentClass.toString()).toBe(classA._id.toString());
      expect(abena.currentClass.toString()).toBe(classB._id.toString());

      // Verify guardian has both siblings linked
      const kojoGuardian = await Guardian.findById(amara.guardians[0]._id);
      expect(kojoGuardian.students.length).toBe(2);
      expect(kojoGuardian.students).toContainEqual(amara._id);
      expect(kojoGuardian.students).toContainEqual(yaw._id);
    });
  });
});
