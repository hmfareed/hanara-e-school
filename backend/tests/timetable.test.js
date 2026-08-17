const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const AcademicYear = require('../src/models/AcademicYear');
const ClassLevel = require('../src/models/ClassLevel');
const Class = require('../src/models/Class');
const Timetable = require('../src/models/Timetable');

describe('Master Timetable & Conflict Engine', () => {
  let adminToken, teacherToken, teacher2Token;
  let adminUser, teacher1User, teacher2User;
  let academicYear;
  let class1, class2;

  beforeAll(async () => {
    await User.deleteMany({});
    await AcademicYear.deleteMany({});
    await ClassLevel.deleteMany({});
    await Class.deleteMany({});
    await Timetable.deleteMany({});

    // 1. Create Users
    adminUser = await User.create({
      email: 'admin.timetable@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'admin',
      isActive: true,
      approvalStatus: 'approved',
    });

    teacher1User = await User.create({
      firstName: 'Kwabena',
      lastName: 'Amoah',
      email: 'teacher1.timetable@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'teacher',
      isActive: true,
      approvalStatus: 'approved',
    });

    teacher2User = await User.create({
      firstName: 'Abena',
      lastName: 'Appiah',
      email: 'teacher2.timetable@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'teacher',
      isActive: true,
      approvalStatus: 'approved',
    });

    // Login tokens
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin.timetable@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app).post('/api/auth/login').send({
      email: 'teacher1.timetable@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    teacherToken = teacherLogin.body.data.accessToken;

    const teacher2Login = await request(app).post('/api/auth/login').send({
      email: 'teacher2.timetable@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    teacher2Token = teacher2Login.body.data.accessToken;

    // 2. Create Academic Year
    academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [
        { name: 'Term 1', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-15') },
      ],
      isCurrent: true,
    });

    // 3. Create Class Level & Classes
    const level = await ClassLevel.create({
      levelCode: 'BS4',
      displayName: 'Primary 4',
      order: 8,
      category: 'Primary',
    });

    class1 = await Class.create({
      name: 'Primary 4A',
      level: level._id,
      academicYear: academicYear._id,
    });

    class2 = await Class.create({
      name: 'Primary 4B',
      level: level._id,
      academicYear: academicYear._id,
    });
  });

  describe('POST /api/timetables/slot — Creation & Clash Prevention', () => {
    it('should successfully create a valid timetable period slot', async () => {
      const res = await request(app)
        .post('/api/timetables/slot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          class: class1._id.toString(),
          teacher: teacher1User._id.toString(),
          subject: 'Mathematics',
          day: 'Monday',
          startTime: '08:00 AM',
          endTime: '08:45 AM',
          periodType: 'lesson',
          room: 'Room 4A',
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBe('Mathematics');
      expect(res.body.data.startTime).toBe('08:00 AM');
    });

    it('should detect and prevent teacher double-booking at the same time in another class', async () => {
      // Attempt to schedule Teacher 1 in Primary 4B during Monday 08:00 AM - 08:45 AM
      const res = await request(app)
        .post('/api/timetables/slot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          class: class2._id.toString(),
          teacher: teacher1User._id.toString(),
          subject: 'Science',
          day: 'Monday',
          startTime: '08:00 AM',
          endTime: '08:45 AM',
          periodType: 'lesson',
          room: 'Science Lab',
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already scheduled');
      expect(res.body.clashes[0].type).toBe('teacher_conflict');
    });

    it('should detect and prevent room double-booking', async () => {
      // Attempt to schedule Teacher 2 in Room 4A during Monday 08:15 AM - 09:00 AM (overlaps 08:00 - 08:45)
      const res = await request(app)
        .post('/api/timetables/slot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          class: class2._id.toString(),
          teacher: teacher2User._id.toString(),
          subject: 'English Language',
          day: 'Monday',
          startTime: '08:15 AM',
          endTime: '09:00 AM',
          periodType: 'lesson',
          room: 'Room 4A',
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already reserved');
      expect(res.body.clashes[0].type).toBe('room_conflict');
    });

    it('should allow scheduling a different teacher and room in the second class at the same time', async () => {
      const res = await request(app)
        .post('/api/timetables/slot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          class: class2._id.toString(),
          teacher: teacher2User._id.toString(),
          subject: 'English Language',
          day: 'Monday',
          startTime: '08:00 AM',
          endTime: '08:45 AM',
          periodType: 'lesson',
          room: 'Room 4B',
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/timetables/check-clashes', () => {
    it('should return conflict details during pre-flight clash check', async () => {
      const res = await request(app)
        .post('/api/timetables/check-clashes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classId: class2._id.toString(),
          teacherId: teacher1User._id.toString(),
          day: 'Monday',
          startTime: '08:00 AM',
          endTime: '08:45 AM',
          room: 'Room 4B',
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(200);
      expect(res.body.hasClash).toBe(true);
      expect(res.body.clashes.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/timetables/clone-class', () => {
    it('should clone all periods from source class to target class', async () => {
      const res = await request(app)
        .post('/api/timetables/clone-class')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceClassId: class1._id.toString(),
          targetClassId: class2._id.toString(),
          academicYear: '2026/2027',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);

      const targetSlots = await Timetable.find({ class: class2._id });
      expect(targetSlots.length).toBe(1);
      expect(targetSlots[0].subject).toBe('Mathematics');
    });
  });
});
