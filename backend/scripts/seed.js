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

    // 6. Create Class Documents
    console.log('Seeding Classes...');
    const classPrimary1 = await Class.create({
      level: levelMap['BS1'],
      name: 'Primary 1 Gold',
      academicYear: academicYear._id,
      classTeacher: teacherStaff._id,
      capacity: 35,
    });

    const classJhs1 = await Class.create({
      level: levelMap['BS7'],
      name: 'JHS 1 Red',
      academicYear: academicYear._id,
      capacity: 40,
    });

    // Assign classes to teacher staff
    teacherStaff.classesAssigned = [classPrimary1._id];
    await teacherStaff.save();

    // 7. Create Guardians
    console.log('Seeding Guardians...');
    const guardian = await Guardian.create({
      firstName: 'Mahama',
      lastName: 'Bawumia',
      relationship: 'father',
      phone: '0244999888',
      email: 'mahama.bawumia@gmail.com',
      occupation: 'Trader',
      address: 'Junction Rd, Tamale',
      momoNumber: '0244999888',
      momoProvider: 'mtn',
      consentDataProcessing: { granted: true, grantedAt: new Date() },
    });

    // Create User login for parent
    await User.create({
      email: 'parent@hanaraschools.edu.gh',
      phone: '0244999888',
      passwordHash: 'Parent@2026',
      role: 'parent',
      refGuardian: guardian._id,
      isActive: true,
    });

    // 8. Create Students
    console.log('Seeding Students...');
    const student1 = await Student.create({
      admissionNumber: 'HNRA/2026/0001',
      firstName: 'Alhassan',
      lastName: 'Mahama',
      gender: 'male',
      dob: new Date('2020-03-12'),
      currentClass: classPrimary1._id,
      guardians: [guardian._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      medicalNotes: 'No known allergies',
      transport: { usesBus: true, stop: 'Tamale Main Market' },
    });

    const student2 = await Student.create({
      admissionNumber: 'HNRA/2026/0002',
      firstName: 'Amina',
      lastName: 'Mahama',
      gender: 'female',
      dob: new Date('2014-08-25'),
      currentClass: classJhs1._id,
      guardians: [guardian._id],
      enrollmentDate: new Date('2026-09-08'),
      status: 'active',
      transport: { usesBus: false },
    });

    // Link students back to guardian
    guardian.students = [student1._id, student2._id];
    await guardian.save();

    console.log('🎉 Seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seed();
