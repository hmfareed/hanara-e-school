// Fix Node.js c-ares SRV DNS resolution on Windows
require('dns').setDefaultResultOrder('ipv4first');

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SchoolProfile = require('../src/models/SchoolProfile');
const AcademicYear = require('../src/models/AcademicYear');
const ClassLevel = require('../src/models/ClassLevel');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const Staff = require('../src/models/Staff');
const Guardian = require('../src/models/Guardian');
const Student = require('../src/models/Student');
const AttendanceRecord = require('../src/models/AttendanceRecord');
const Route = require('../src/models/Route');
const Bus = require('../src/models/Bus');
const DailyFeeRegister = require('../src/models/DailyFeeRegister');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment');
    }

    console.log('Connecting to database for seeding...');
    await mongoose.connect(mongoUri);
    console.log('Connected to database.');

    // Clear collections
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      SchoolProfile.deleteMany({}),
      AcademicYear.deleteMany({}),
      ClassLevel.deleteMany({}),
      Class.deleteMany({}),
      Subject.deleteMany({}),
      Staff.deleteMany({}),
      Guardian.deleteMany({}),
      Student.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      Route.deleteMany({}),
      Bus.deleteMany({}),
      DailyFeeRegister.deleteMany({}),
    ]);
    console.log('Database cleared.');

    // 1. Create Academic Year
    console.log('Seeding Academic Year...');
    const academicYear = await AcademicYear.create({
      name: '2026/2027',
      terms: [
        { name: 'Term 1', startDate: new Date('2026-09-08'), endDate: new Date('2026-12-18') },
        { name: 'Term 2', startDate: new Date('2027-01-12'), endDate: new Date('2027-04-16') },
        { name: 'Term 3', startDate: new Date('2027-05-11'), endDate: new Date('2027-08-20') },
      ],
      isCurrent: true,
    });

    // 2. Create School Profile
    console.log('Seeding School Profile...');
    await SchoolProfile.create({
      name: 'HANARA SCHOOLS',
      motto: 'Knowledge, Integrity, and Excellence',
      logoUrl: '',
      address: 'P.O. Box TL 123, Tamale, Northern Region, Ghana',
      phone: '+233 24 412 3456',
      email: 'info@hanaraschools.edu.gh',
      currentAcademicYear: academicYear._id,
      dataProtectionRegistrationNumber: 'DPC-HNRA-2026-843',
    });

    // 3. Create Class Levels
    console.log('Seeding Class Levels...');
    const levelsData = [
      { levelCode: 'N1', displayName: 'Nursery 1', order: 1, category: 'Nursery' },
      { levelCode: 'N2', displayName: 'Nursery 2', order: 2, category: 'Nursery' },
      { levelCode: 'KG1', displayName: 'KG 1', order: 3, category: 'KG' },
      { levelCode: 'KG2', displayName: 'KG 2', order: 4, category: 'KG' },
      { levelCode: 'BS1', displayName: 'Primary 1', order: 5, category: 'Primary' },
      { levelCode: 'BS2', displayName: 'Primary 2', order: 6, category: 'Primary' },
      { levelCode: 'BS3', displayName: 'Primary 3', order: 7, category: 'Primary' },
      { levelCode: 'BS4', displayName: 'Primary 4', order: 8, category: 'Primary' },
      { levelCode: 'BS5', displayName: 'Primary 5', order: 9, category: 'Primary' },
      { levelCode: 'BS6', displayName: 'Primary 6', order: 10, category: 'Primary' },
      { levelCode: 'BS7', displayName: 'JHS 1', order: 11, category: 'JHS' },
      { levelCode: 'BS8', displayName: 'JHS 2', order: 12, category: 'JHS' },
      { levelCode: 'BS9', displayName: 'JHS 3', order: 13, category: 'JHS' },
    ];
    const levels = await ClassLevel.insertMany(levelsData);
    const levelMap = levels.reduce((acc, level) => {
      acc[level.levelCode] = level._id;
      return acc;
    }, {});

    // 4. Create Subjects/Strands
    console.log('Seeding Subjects/Strands...');
    // strands for KG/Nursery
    const kgStrands = [
      { name: 'Numeracy', code: 'KG-NUM', type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Literacy', code: 'KG-LIT', type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Creative Arts', code: 'KG-ART', type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Our World, Our People', code: 'KG-OWOP', type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
    ];
    await Subject.insertMany(kgStrands);

    // Primary subjects
    const primaryLevels = [levelMap['BS1'], levelMap['BS2'], levelMap['BS3'], levelMap['BS4'], levelMap['BS5'], levelMap['BS6']];
    const primarySubjects = [
      { name: 'English Language', code: 'PRI-ENG', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Mathematics', code: 'PRI-MAT', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Science', code: 'PRI-SCI', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Our World and Our People', code: 'PRI-OWOP', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Religious & Moral Education', code: 'PRI-RME', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Creative Arts', code: 'PRI-CRT', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Physical Education', code: 'PRI-PE', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'History of Ghana', code: 'PRI-HIST', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Ghanaian Language', code: 'PRI-GHL', type: 'subject', appliesToLevels: primaryLevels },
    ];
    await Subject.insertMany(primarySubjects);

    // JHS subjects
    const jhsLevels = [levelMap['BS7'], levelMap['BS8'], levelMap['BS9']];
    const jhsSubjects = [
      { name: 'English Language', code: 'JHS-ENG', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Mathematics', code: 'JHS-MAT', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Integrated Science', code: 'JHS-INT', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Social Studies', code: 'JHS-SOC', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Religious & Moral Education', code: 'JHS-RME', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Career Technology', code: 'JHS-CAR', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Computing', code: 'JHS-COMP', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Creative Arts & Design', code: 'JHS-CAD', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Ghanaian Language', code: 'JHS-GHL', type: 'subject', appliesToLevels: jhsLevels },
    ];
    await Subject.insertMany(jhsSubjects);

    // 5. Create Staff Profiles and User Accounts
    console.log('Seeding Staff and Users...');
    // Superadmin (Super Admin user is required per config defaults or custom)
    const superAdminUser = await User.create({
      email: process.env.SEED_ADMIN_EMAIL || 'admin@hanaraschools.edu.gh',
      phone: '0244111222',
      passwordHash: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026',
      role: 'superadmin',
      isActive: true,
    });

    // Sample admin staff
    const adminStaff = await Staff.create({
      firstName: 'Abubakar',
      lastName: 'Sadik',
      gender: 'male',
      dob: new Date('1985-05-15'),
      phone: '0244123456',
      email: 'abubakar@hanaraschools.edu.gh',
      qualification: 'B.Ed. Educational Administration',
      employmentDate: new Date('2020-09-01'),
      employmentStatus: 'active',
      role: 'admin',
    });
    await User.create({
      email: 'abubakar@hanaraschools.edu.gh',
      phone: '0244123456',
      passwordHash: 'Admin@2026',
      role: 'admin',
      refStaff: adminStaff._id,
      isActive: true,
    });

    // Sample teacher staff
    const teacherStaff = await Staff.create({
      firstName: 'Mariam',
      lastName: 'Issah',
      gender: 'female',
      dob: new Date('1990-07-20'),
      phone: '0244223344',
      email: 'mariam@hanaraschools.edu.gh',
      qualification: 'Diploma in Basic Education',
      employmentDate: new Date('2022-01-15'),
      employmentStatus: 'active',
      role: 'teacher',
    });
    await User.create({
      email: 'mariam@hanaraschools.edu.gh',
      phone: '0244223344',
      passwordHash: 'Teacher@2026',
      role: 'teacher',
      refStaff: teacherStaff._id,
      isActive: true,
    });

    // User's teacher account (Mohammed Fareed)
    const fareedStaff = await Staff.create({
      firstName: 'Mohammed',
      lastName: 'Fareed',
      gender: 'male',
      dob: new Date('1995-05-10'),
      phone: '0244111333',
      email: 'hmohammedfareedmandeeya@gmail.com',
      qualification: 'B.Ed. Computer Science',
      employmentDate: new Date('2023-09-01'),
      employmentStatus: 'active',
      role: 'teacher',
    });
    await User.create({
      email: 'hmohammedfareedmandeeya@gmail.com',
      phone: '0244111333',
      passwordHash: 'JoshuaKimmich6',
      role: 'teacher',
      refStaff: fareedStaff._id,
      isActive: true,
      approvalStatus: 'approved',
    });

    // Sample accountant staff
    const accountantStaff = await Staff.create({
      firstName: 'Joseph',
      lastName: 'Mensah',
      gender: 'male',
      dob: new Date('1988-11-05'),
      phone: '0244334455',
      email: 'joseph@hanaraschools.edu.gh',
      qualification: 'B.Com. Accounting',
      employmentDate: new Date('2021-06-01'),
      employmentStatus: 'active',
      role: 'accountant',
    });
    await User.create({
      email: 'joseph@hanaraschools.edu.gh',
      phone: '0244334455',
      passwordHash: 'Accountant@2026',
      role: 'accountant',
      refStaff: accountantStaff._id,
      isActive: true,
    });

    // Driver 1 — Primary Bus: Mba Alhassan
    const driverMba = await Staff.create({
      firstName: 'Mba',
      lastName: 'Alhassan',
      gender: 'male',
      dob: new Date('1980-06-10'),
      phone: '0244556677',
      email: 'mba.alhassan@hanaraschools.edu.gh',
      qualification: 'DVLA License F',
      employmentDate: new Date('2019-03-01'),
      employmentStatus: 'active',
      role: 'driver',
    });
    await User.create({
      email: 'mba.alhassan@hanaraschools.edu.gh',
      phone: '0244556677',
      passwordHash: 'Driver@2026',
      role: 'driver',
      refStaff: driverMba._id,
      isActive: true,
    });

    // Driver 2 — JHS Bus: Captain Baba
    const driverCaptain = await Staff.create({
      firstName: 'Captain',
      lastName: 'Baba',
      gender: 'male',
      dob: new Date('1978-11-22'),
      phone: '0244778899',
      email: 'captain.baba@hanaraschools.edu.gh',
      qualification: 'DVLA License E',
      employmentDate: new Date('2018-08-01'),
      employmentStatus: 'active',
      role: 'driver',
    });
    await User.create({
      email: 'captain.baba@hanaraschools.edu.gh',
      phone: '0244778899',
      passwordHash: 'Driver@2026',
      role: 'driver',
      refStaff: driverCaptain._id,
      isActive: true,
    });


    // 6. Create Class Documents
    // NOTE: Zogbeli branch = Nursery 1 → Primary 4 (no bus service).
    //       Vittin Barrier branch = Primary 5, 6 and JHS 1, 2, 3 (bus eligible).
    console.log('Seeding Classes...');

    // Zogbeli branch — no bus, used for teacher login demo
    const classPrimary1 = await Class.create({
      level: levelMap['BS1'],
      name: 'Primary 1 Gold',
      academicYear: academicYear._id,
      classTeacher: teacherStaff._id,
      capacity: 35,
    });

    // Vittin Barrier branch — bus-eligible classes
    const classPrimary5 = await Class.create({
      level: levelMap['BS5'],
      name: 'Primary 5 Gold',
      academicYear: academicYear._id,
      classTeacher: fareedStaff._id,
      capacity: 35,
    });

    const classPrimary6 = await Class.create({
      level: levelMap['BS6'],
      name: 'Primary 6 Gold',
      academicYear: academicYear._id,
      capacity: 35,
    });

    const classJhs1 = await Class.create({
      level: levelMap['BS7'],
      name: 'JHS 1 Blue',
      academicYear: academicYear._id,
      capacity: 40,
    });

    const classJhs2 = await Class.create({
      level: levelMap['BS8'],
      name: 'JHS 2 Blue',
      academicYear: academicYear._id,
      capacity: 40,
    });

    const classJhs3 = await Class.create({
      level: levelMap['BS9'],
      name: 'JHS 3 Blue',
      academicYear: academicYear._id,
      capacity: 40,
    });

    // Assign teacher to Primary 1 (Zogbeli demo)
    teacherStaff.classesAssigned = [classPrimary1._id];
    await teacherStaff.save();

    // Assign teacher to Primary 5 (Vittin Barrier)
    fareedStaff.classesAssigned = [classPrimary5._id];
    await fareedStaff.save();


    // 7.5 Seeding Routes & Buses
    // ─────────────────────────────────────────────────────────────────────
    // Both buses depart from Zogbeli at 07:00 AM and arrive at Vittin Barrier.
    // On return, buses leave Vittin Barrier at 03:00 PM back to Zogbeli.
    //
    // PRIMARY ROUTE  (Primary 5 & 6 bus, driver: Mba Alhassan)
    //   Zogbeli (07:00) → Legion (07:12) → NIB (07:22) → Vittin Barrier (school)
    //
    // JHS ROUTE  (JHS 1, 2 & 3 bus, driver: Captain Baba)
    //   Zogbeli (07:00) → Legion (07:12) → NIB (07:22) → Teaching Hospital (07:32)
    //   → Vittin Barrier (school)
    // ─────────────────────────────────────────────────────────────────────
    console.log('Seeding Routes & Buses...');

    // Route for Primary 5 & 6 bus
    const routePrimary = await Route.create({
      name: 'Primary Route — Zogbeli to Vittin Barrier',
      pickupTime: '07:00 AM',
      dropoffTime: '03:00 PM',
      stops: [
        { name: 'Zogbeli (School Branch)', order: 1, approxPickupTime: '07:00 AM' },
        { name: 'Legion', order: 2, approxPickupTime: '07:12 AM' },
        { name: 'National Investment Bank (NIB)', order: 3, approxPickupTime: '07:22 AM' },
        { name: 'Vittin Barrier', order: 4, approxPickupTime: '07:32 AM' },
      ],
    });

    // Route for JHS bus (extra stop at Teaching Hospital)
    const routeJHS = await Route.create({
      name: 'JHS Route — Zogbeli to Vittin Barrier',
      pickupTime: '07:00 AM',
      dropoffTime: '03:00 PM',
      stops: [
        { name: 'Zogbeli (School Branch)', order: 1, approxPickupTime: '07:00 AM' },
        { name: 'Legion', order: 2, approxPickupTime: '07:12 AM' },
        { name: 'National Investment Bank (NIB)', order: 3, approxPickupTime: '07:22 AM' },
        { name: 'Tamale Teaching Hospital', order: 4, approxPickupTime: '07:32 AM' },
        { name: 'Vittin Barrier', order: 5, approxPickupTime: '07:42 AM' },
      ],
    });

    // Primary bus — Mba Alhassan, serves Primary 5 & 6
    const busPrimary = await Bus.create({
      plateNumber: 'NR-PRI-26',
      capacity: 35,
      driver: driverMba._id,
      route: routePrimary._id,
    });

    // JHS bus — Captain Baba, serves JHS 1, 2 & 3
    const busJHS = await Bus.create({
      plateNumber: 'NR-JHS-26',
      capacity: 45,
      driver: driverCaptain._id,
      route: routeJHS._id,
    });

    // 8. Create Students
    // Sample students spread across bus-eligible classes and realistic stops
    console.log('Seeding Students...');

    // Guardian for Primary students
    const guardianA = await Guardian.create({
      firstName: 'Mahama',
      lastName: 'Bawumia',
      relationship: 'father',
      phone: '0244999888',
      email: 'mahama.bawumia@gmail.com',
      occupation: 'Trader',
      address: 'Zogbeli, Tamale',
      momoNumber: '0244999888',
      momoProvider: 'mtn',
      consentDataProcessing: { granted: true, grantedAt: new Date() },
    });
    await User.create({
      email: 'parent@hanaraschools.edu.gh',
      phone: '0244999888',
      passwordHash: 'Parent@2026',
      role: 'parent',
      refGuardian: guardianA._id,
      isActive: true,
    });

    // Guardian for JHS students
    const guardianB = await Guardian.create({
      firstName: 'Fuseini',
      lastName: 'Abdulai',
      relationship: 'father',
      phone: '0244111333',
      email: '',
      occupation: 'Civil Servant',
      address: 'Legion Area, Tamale',
      consentDataProcessing: { granted: true, grantedAt: new Date() },
    });

    // ── Primary 5 students (Primary bus) ──
    const studentPri5A = await Student.create({
      admissionNumber: 'HNRA/2026/0001',
      firstName: 'Alhassan',
      lastName: 'Bawumia',
      gender: 'male',
      dob: new Date('2014-03-12'),
      currentClass: classPrimary5._id,
      guardians: [guardianA._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busPrimary._id, stop: 'Zogbeli (School Branch)' },
    });

    const studentPri5B = await Student.create({
      admissionNumber: 'HNRA/2026/0002',
      firstName: 'Amina',
      lastName: 'Bawumia',
      gender: 'female',
      dob: new Date('2015-06-25'),
      currentClass: classPrimary5._id,
      guardians: [guardianA._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busPrimary._id, stop: 'Legion' },
    });

    // ── Primary 6 students (Primary bus) ──
    const studentPri6A = await Student.create({
      admissionNumber: 'HNRA/2026/0003',
      firstName: 'Rashida',
      lastName: 'Fuseini',
      gender: 'female',
      dob: new Date('2013-09-14'),
      currentClass: classPrimary6._id,
      guardians: [guardianA._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busPrimary._id, stop: 'National Investment Bank (NIB)' },
    });

    // ── JHS 1 students (JHS bus) ──
    const studentJhs1A = await Student.create({
      admissionNumber: 'HNRA/2026/0004',
      firstName: 'Ibrahim',
      lastName: 'Abdulai',
      gender: 'male',
      dob: new Date('2012-01-18'),
      currentClass: classJhs1._id,
      guardians: [guardianB._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busJHS._id, stop: 'Legion' },
    });

    const studentJhs1B = await Student.create({
      admissionNumber: 'HNRA/2026/0005',
      firstName: 'Fatima',
      lastName: 'Abdulai',
      gender: 'female',
      dob: new Date('2012-07-30'),
      currentClass: classJhs1._id,
      guardians: [guardianB._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busJHS._id, stop: 'Tamale Teaching Hospital' },
    });

    // ── JHS 2 student (JHS bus) ──
    const studentJhs2A = await Student.create({
      admissionNumber: 'HNRA/2026/0006',
      firstName: 'Yakubu',
      lastName: 'Issah',
      gender: 'male',
      dob: new Date('2011-04-05'),
      currentClass: classJhs2._id,
      guardians: [guardianB._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busJHS._id, stop: 'National Investment Bank (NIB)' },
    });

    // ── JHS 3 student (JHS bus) ──
    const studentJhs3A = await Student.create({
      admissionNumber: 'HNRA/2026/0007',
      firstName: 'Mariama',
      lastName: 'Fuseini',
      gender: 'female',
      dob: new Date('2010-11-12'),
      currentClass: classJhs3._id,
      guardians: [guardianB._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: true, bus: busJHS._id, stop: 'Zogbeli (School Branch)' },
    });

    // Link students back to guardians
    guardianA.students = [studentPri5A._id, studentPri5B._id, studentPri6A._id];
    await guardianA.save();
    guardianB.students = [studentJhs1A._id, studentJhs1B._id, studentJhs2A._id, studentJhs3A._id];
    await guardianB.save();


    console.log('🎉 Seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seed();
