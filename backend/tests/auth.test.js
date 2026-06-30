const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate a user with correct credentials', async () => {
      await User.create({
        email: 'test@hanaraschools.edu.gh',
        phone: '0244111222',
        passwordHash: 'Password123!',
        role: 'admin',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@hanaraschools.edu.gh',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('test@hanaraschools.edu.gh');
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should reject login for inactive users', async () => {
      await User.create({
        email: 'inactive@hanaraschools.edu.gh',
        phone: '0244111222',
        passwordHash: 'Password123!',
        role: 'admin',
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@hanaraschools.edu.gh',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with wrong password', async () => {
      await User.create({
        email: 'test@hanaraschools.edu.gh',
        phone: '0244111222',
        passwordHash: 'Password123!',
        role: 'admin',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@hanaraschools.edu.gh',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register-teacher', () => {
    let registrationCode;
    let academicYear;
    let classObj;
    let subjectObj;
    let adminUser;

    beforeEach(async () => {
      const RegistrationCode = require('../src/models/RegistrationCode');
      const AcademicYear = require('../src/models/AcademicYear');
      const Class = require('../src/models/Class');
      const Subject = require('../src/models/Subject');
      const ClassSubjectAssignment = require('../src/models/ClassSubjectAssignment');
      const Staff = require('../src/models/Staff');
      const ClassLevel = require('../src/models/ClassLevel');

      await RegistrationCode.deleteMany({});
      await AcademicYear.deleteMany({});
      await ClassLevel.deleteMany({});
      await Class.deleteMany({});
      await Subject.deleteMany({});
      await ClassSubjectAssignment.deleteMany({});
      await Staff.deleteMany({});

      // Create admin user for creating registration code
      adminUser = await User.create({
        email: 'admin@hanaraschools.edu.gh',
        phone: '0244111222',
        passwordHash: 'Password123!',
        role: 'admin',
        isActive: true,
      });

      // Create active registration code
      registrationCode = await RegistrationCode.create({
        code: '123456',
        createdBy: adminUser._id,
        isActive: true,
        isUsed: false,
      });

      // Create current academic year
      academicYear = await AcademicYear.create({
        name: '2026/2027',
        isCurrent: true,
        terms: [{ name: 'Term 1', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }]
      });

      // Create a class level
      const classLevel = await ClassLevel.create({
        levelCode: 'BS1',
        displayName: 'Primary 1',
        order: 1,
        category: 'Primary'
      });

      // Create a class
      classObj = await Class.create({
        level: classLevel._id,
        name: 'Class 1A',
        capacity: 30,
        academicYear: academicYear._id
      });

      // Create a subject
      subjectObj = await Subject.create({
        name: 'Mathematics',
        code: 'MATH101',
      });
    });

    it('should prevent teacher registration if no classes or subjects are chosen', async () => {
      const res = await request(app)
        .post('/api/auth/register-teacher')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hanaraschools.edu.gh',
          password: 'Password123!',
          role: 'teacher',
          gender: 'male',
          phone: '0244000111',
          registrationCode: '123456',
          classesAssigned: [],
          subjectsAssigned: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least one class');
    });

    it('should successfully register teacher if classes and subjects are chosen', async () => {
      const ClassSubjectAssignment = require('../src/models/ClassSubjectAssignment');

      const res = await request(app)
        .post('/api/auth/register-teacher')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hanaraschools.edu.gh',
          password: 'Password123!',
          role: 'teacher',
          gender: 'male',
          phone: '0244000111',
          registrationCode: '123456',
          classesAssigned: [classObj._id.toString()],
          subjectsAssigned: [subjectObj._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify assignment was created
      const assignments = await ClassSubjectAssignment.find({ teacher: res.body.data.staffId });
      expect(assignments.length).toBe(1);
      expect(assignments[0].class.toString()).toBe(classObj._id.toString());
      expect(assignments[0].subject.toString()).toBe(subjectObj._id.toString());
    });

    it('should allow non-teachers to register without classes and subjects', async () => {
      const res = await request(app)
        .post('/api/auth/register-teacher')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@hanaraschools.edu.gh',
          password: 'Password123!',
          role: 'accountant',
          gender: 'female',
          phone: '0244000222',
          registrationCode: '123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow multiple registrations with the same PIN (multi-use code)', async () => {
      // First registration
      const res1 = await request(app)
        .post('/api/auth/register-teacher')
        .send({
          firstName: 'User1',
          lastName: 'Test',
          email: 'user1@hanaraschools.edu.gh',
          password: 'Password123!',
          role: 'accountant',
          gender: 'male',
          phone: '0244000111',
          registrationCode: '123456',
        });
      expect(res1.status).toBe(201);

      // Second registration with the same PIN
      const res2 = await request(app)
        .post('/api/auth/register-teacher')
        .send({
          firstName: 'User2',
          lastName: 'Test',
          email: 'user2@hanaraschools.edu.gh',
          password: 'Password123!',
          role: 'accountant',
          gender: 'female',
          phone: '0244000222',
          registrationCode: '123456',
        });
      expect(res2.status).toBe(201);
    });
  });
});
