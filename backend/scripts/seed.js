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

// ── Realistic Ghanaian name pools ───────────────────────────────────────────
const maleFirstNames = [
  'Alhassan', 'Ibrahim', 'Yakubu', 'Mohammed', 'Abdul', 'Fuseini', 'Zakaria',
  'Mustapha', 'Baba', 'Ishmael', 'Sulemana', 'Haruna', 'Nana', 'Kwame',
  'Kofi', 'Kweku', 'Agyei', 'Mensah', 'Boateng', 'Asante', 'Osei', 'Amoah',
  'Yaw', 'Kojo', 'Kwabena', 'Akwasi', 'Samuel', 'Emmanuel', 'Joseph', 'Daniel',
];

const femaleFirstNames = [
  'Amina', 'Fatima', 'Rashida', 'Mariama', 'Hawa', 'Zainab', 'Salamatu',
  'Abibata', 'Mariam', 'Rukaya', 'Adiza', 'Rahinatu', 'Akosua', 'Ama',
  'Abena', 'Akua', 'Adwoa', 'Afua', 'Adjoa', 'Abenaa', 'Efua', 'Comfort',
  'Grace', 'Patience', 'Gifty', 'Eunice', 'Priscilla', 'Diana', 'Esther', 'Sarah',
];

const lastNames = [
  'Bawumia', 'Abdulai', 'Fuseini', 'Issah', 'Alhassan', 'Mohammed', 'Asante',
  'Mensah', 'Owusu', 'Boateng', 'Agyei', 'Osei', 'Amoah', 'Adjei', 'Antwi',
  'Amponsah', 'Appiah', 'Acheampong', 'Ofori', 'Frimpong', 'Nyarko', 'Twumasi',
  'Darko', 'Danso', 'Tetteh', 'Quaye', 'Botchway', 'Ghansah', 'Lamptey', 'Nkrumah',
  'Yakubu', 'Sulemana', 'Haruna', 'Zakaria', 'Mustapha', 'Ibrahim', 'Adam',
];

const guardianRelationships = ['father', 'mother', 'uncle', 'aunt', 'guardian'];
const occupations = ['Trader', 'Civil Servant', 'Teacher', 'Nurse', 'Farmer', 'Driver', 'Engineer', 'Accountant', 'Tailor', 'Mechanic'];
const addresses = [
  'Zogbeli, Tamale', 'Legion Area, Tamale', 'Vittin, Tamale', 'Lamashegu, Tamale',
  'Jisonayili, Tamale', 'Datoyili, Tamale', 'Kalpohin, Tamale', 'Sabonjida, Tamale',
  'Gurugu, Tamale', 'Tishigu, Tamale', 'Hospital Area, Tamale', 'NIB Area, Tamale',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let globalAdmissionSeq = 0;
const makeAdmissionNum = (year) => {
  globalAdmissionSeq++;
  return `HNRA/${year}/${String(globalAdmissionSeq).padStart(4, '0')}`;
};

const makePhone = () => {
  const prefixes = ['024', '054', '055', '059', '020', '050', '026', '027', '028'];
  const prefix = pick(prefixes);
  const rest = String(Math.floor(Math.random() * 9000000) + 1000000);
  return prefix + rest;
};

/**
 * Generate 20 student docs for a given class.
 * Returns { students[], guardians[] } as plain objects ready for insertMany.
 */
const generateStudentsForClass = (classDoc, year) => {
  const students = [];
  const guardians = [];

  for (let i = 0; i < 20; i++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const firstName = gender === 'male' ? pick(maleFirstNames) : pick(femaleFirstNames);
    const lastName = pick(lastNames);

    // Age range appropriate for the class order stored on level
    const classOrder = classDoc._levelOrder || 6; // fallback
    const ageYears = 5 + classOrder + Math.floor(Math.random() * 2); // rough approximation
    const dobYear = year - ageYears;
    const dobMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const dobDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const dob = new Date(`${dobYear}-${dobMonth}-${dobDay}`);

    // Guardian
    const guardianGender = Math.random() < 0.5 ? 'male' : 'female';
    const guardianFirstName = guardianGender === 'male' ? pick(maleFirstNames) : pick(femaleFirstNames);
    const guardianLastName = lastName; // same family name often
    const guardianPhone = makePhone();
    const relationship = guardianGender === 'male' ? pick(['father', 'uncle', 'guardian']) : pick(['mother', 'aunt', 'guardian']);

    const guardianId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();

    const guardian = {
      _id: guardianId,
      firstName: guardianFirstName,
      lastName: guardianLastName,
      relationship,
      phone: guardianPhone,
      altPhone: '',
      email: '',
      occupation: pick(occupations),
      address: pick(addresses),
      students: [studentId],
      consentDataProcessing: { granted: true, grantedAt: new Date() },
    };

    const student = {
      _id: studentId,
      admissionNumber: makeAdmissionNum(year),
      firstName,
      lastName,
      otherNames: '',
      gender,
      dob,
      currentClass: classDoc._id,
      guardians: [guardianId],
      enrollmentDate: new Date(`${year}-09-08`),
      status: 'active',
      medicalNotes: '',
      transport: { usesBus: false, bus: null, stop: '' },
    };

    students.push(student);
    guardians.push(guardian);
  }

  return { students, guardians };
};

// ─────────────────────────────────────────────────────────────────────────────

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

    const currentYear = 2026;

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
      { levelCode: 'N1',  displayName: 'Nursery 1', order: 1,  category: 'Nursery' },
      { levelCode: 'N2',  displayName: 'Nursery 2', order: 2,  category: 'Nursery' },
      { levelCode: 'KG1', displayName: 'KG 1',      order: 3,  category: 'KG'      },
      { levelCode: 'KG2', displayName: 'KG 2',      order: 4,  category: 'KG'      },
      { levelCode: 'BS1', displayName: 'Primary 1', order: 5,  category: 'Primary' },
      { levelCode: 'BS2', displayName: 'Primary 2', order: 6,  category: 'Primary' },
      { levelCode: 'BS3', displayName: 'Primary 3', order: 7,  category: 'Primary' },
      { levelCode: 'BS4', displayName: 'Primary 4', order: 8,  category: 'Primary' },
      { levelCode: 'BS5', displayName: 'Primary 5', order: 9,  category: 'Primary' },
      { levelCode: 'BS6', displayName: 'Primary 6', order: 10, category: 'Primary' },
      { levelCode: 'BS7', displayName: 'JHS 1',     order: 11, category: 'JHS'     },
      { levelCode: 'BS8', displayName: 'JHS 2',     order: 12, category: 'JHS'     },
      { levelCode: 'BS9', displayName: 'JHS 3',     order: 13, category: 'JHS'     },
    ];
    const levels = await ClassLevel.insertMany(levelsData);
    const levelMap = levels.reduce((acc, level) => {
      acc[level.levelCode] = level._id;
      return acc;
    }, {});

    // 4. Create Subjects/Strands
    console.log('Seeding Subjects/Strands...');
    const kgStrands = [
      { name: 'Numeracy',            code: 'KG-NUM',  type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Literacy',            code: 'KG-LIT',  type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Creative Arts',       code: 'KG-ART',  type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
      { name: 'Our World, Our People', code: 'KG-OWOP', type: 'strand', appliesToLevels: [levelMap['N1'], levelMap['N2'], levelMap['KG1'], levelMap['KG2']] },
    ];
    await Subject.insertMany(kgStrands);

    const primaryLevels = [levelMap['BS1'], levelMap['BS2'], levelMap['BS3'], levelMap['BS4'], levelMap['BS5'], levelMap['BS6']];
    const primarySubjects = [
      { name: 'English Language',          code: 'PRI-ENG',  type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Mathematics',               code: 'PRI-MAT',  type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Science',                   code: 'PRI-SCI',  type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Our World and Our People',  code: 'PRI-OWOP', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Religious & Moral Education', code: 'PRI-RME', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Creative Arts',             code: 'PRI-CRT',  type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Physical Education',        code: 'PRI-PE',   type: 'subject', appliesToLevels: primaryLevels },
      { name: 'History of Ghana',          code: 'PRI-HIST', type: 'subject', appliesToLevels: primaryLevels },
      { name: 'Ghanaian Language',         code: 'PRI-GHL',  type: 'subject', appliesToLevels: primaryLevels },
    ];
    await Subject.insertMany(primarySubjects);

    const jhsLevels = [levelMap['BS7'], levelMap['BS8'], levelMap['BS9']];
    const jhsSubjects = [
      { name: 'English Language',    code: 'JHS-ENG',  type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Mathematics',         code: 'JHS-MAT',  type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Integrated Science',  code: 'JHS-INT',  type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Social Studies',      code: 'JHS-SOC',  type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Religious & Moral Education', code: 'JHS-RME', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Career Technology',   code: 'JHS-CAR',  type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Computing',           code: 'JHS-COMP', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Creative Arts & Design', code: 'JHS-CAD', type: 'subject', appliesToLevels: jhsLevels },
      { name: 'Ghanaian Language',   code: 'JHS-GHL',  type: 'subject', appliesToLevels: jhsLevels },
    ];
    await Subject.insertMany(jhsSubjects);

    // 5. Create Staff & User Accounts
    console.log('Seeding Staff and Users...');
    await User.create({
      email: process.env.SEED_ADMIN_EMAIL || 'admin@hanaraschools.edu.gh',
      phone: '0244111222',
      passwordHash: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026',
      role: 'superadmin',
      isActive: true,
    });

    const adminStaff = await Staff.create({
      firstName: 'Abubakar', lastName: 'Sadik', gender: 'male',
      dob: new Date('1985-05-15'), phone: '0244123456',
      email: 'abubakar@hanaraschools.edu.gh',
      qualification: 'B.Ed. Educational Administration',
      employmentDate: new Date('2020-09-01'), employmentStatus: 'active', role: 'admin',
    });
    await User.create({
      email: 'abubakar@hanaraschools.edu.gh', phone: '0244123456',
      passwordHash: 'Admin@2026', role: 'admin', refStaff: adminStaff._id, isActive: true,
    });

    const teacherStaff = await Staff.create({
      firstName: 'Mariam', lastName: 'Issah', gender: 'female',
      dob: new Date('1990-07-20'), phone: '0244223344',
      email: 'mariam@hanaraschools.edu.gh',
      qualification: 'Diploma in Basic Education',
      employmentDate: new Date('2022-01-15'), employmentStatus: 'active', role: 'teacher',
    });
    await User.create({
      email: 'mariam@hanaraschools.edu.gh', phone: '0244223344',
      passwordHash: 'Teacher@2026', role: 'teacher', refStaff: teacherStaff._id, isActive: true,
    });

    const fareedStaff = await Staff.create({
      firstName: 'Mohammed', lastName: 'Fareed', gender: 'male',
      dob: new Date('1995-05-10'), phone: '0244111333',
      email: 'hmohammedfareedmandeeya@gmail.com',
      qualification: 'B.Ed. Computer Science',
      employmentDate: new Date('2023-09-01'), employmentStatus: 'active', role: 'teacher',
    });
    await User.create({
      email: 'hmohammedfareedmandeeya@gmail.com', phone: '0244111333',
      passwordHash: 'JoshuaKimmich6', role: 'teacher', refStaff: fareedStaff._id,
      isActive: true, approvalStatus: 'approved',
    });

    const accountantStaff = await Staff.create({
      firstName: 'Joseph', lastName: 'Mensah', gender: 'male',
      dob: new Date('1988-11-05'), phone: '0244334455',
      email: 'joseph@hanaraschools.edu.gh',
      qualification: 'B.Com. Accounting',
      employmentDate: new Date('2021-06-01'), employmentStatus: 'active', role: 'accountant',
    });
    await User.create({
      email: 'joseph@hanaraschools.edu.gh', phone: '0244334455',
      passwordHash: 'Accountant@2026', role: 'accountant', refStaff: accountantStaff._id, isActive: true,
    });

    const driverMba = await Staff.create({
      firstName: 'Mba', lastName: 'Alhassan', gender: 'male',
      dob: new Date('1980-06-10'), phone: '0244556677',
      email: 'mba.alhassan@hanaraschools.edu.gh', qualification: 'DVLA License F',
      employmentDate: new Date('2019-03-01'), employmentStatus: 'active', role: 'driver',
    });
    await User.create({
      email: 'mba.alhassan@hanaraschools.edu.gh', phone: '0244556677',
      passwordHash: 'Driver@2026', role: 'driver', refStaff: driverMba._id, isActive: true,
    });

    const driverCaptain = await Staff.create({
      firstName: 'Captain', lastName: 'Baba', gender: 'male',
      dob: new Date('1978-11-22'), phone: '0244778899',
      email: 'captain.baba@hanaraschools.edu.gh', qualification: 'DVLA License E',
      employmentDate: new Date('2018-08-01'), employmentStatus: 'active', role: 'driver',
    });
    await User.create({
      email: 'captain.baba@hanaraschools.edu.gh', phone: '0244778899',
      passwordHash: 'Driver@2026', role: 'driver', refStaff: driverCaptain._id, isActive: true,
    });

    // 6. Create Classes — Primary 2 → JHS 3 (plain names, no colour suffixes)
    console.log('Seeding Classes (Primary 2 – JHS 3)...');

    const classDefinitions = [
      { levelCode: 'BS2', name: 'Primary 2',  levelOrder: 6  },
      { levelCode: 'BS3', name: 'Primary 3',  levelOrder: 7  },
      { levelCode: 'BS4', name: 'Primary 4',  levelOrder: 8  },
      { levelCode: 'BS5', name: 'Primary 5',  levelOrder: 9  },
      { levelCode: 'BS6', name: 'Primary 6',  levelOrder: 10 },
      { levelCode: 'BS7', name: 'JHS 1',      levelOrder: 11 },
      { levelCode: 'BS8', name: 'JHS 2',      levelOrder: 12 },
      { levelCode: 'BS9', name: 'JHS 3',      levelOrder: 13 },
    ];

    const createdClasses = [];
    for (const def of classDefinitions) {
      const cls = await Class.create({
        level: levelMap[def.levelCode],
        name: def.name,
        academicYear: academicYear._id,
        classTeacher: def.levelCode === 'BS5' ? fareedStaff._id : (def.levelCode === 'BS2' ? teacherStaff._id : null),
        capacity: 40,
      });
      // Attach levelOrder for student DOB calculations
      cls._levelOrder = def.levelOrder;
      createdClasses.push(cls);
    }

    // Assign teachers to their classes
    teacherStaff.classesAssigned = [createdClasses[0]._id]; // Primary 2
    await teacherStaff.save();
    fareedStaff.classesAssigned = [createdClasses[3]._id]; // Primary 5
    await fareedStaff.save();

    // 7. Routes & Buses
    console.log('Seeding Routes & Buses...');
    const routePrimary = await Route.create({
      name: 'Primary Route — Zogbeli to Vittin Barrier',
      pickupTime: '07:00 AM', dropoffTime: '03:00 PM',
      stops: [
        { name: 'Zogbeli (School Branch)',          order: 1, approxPickupTime: '07:00 AM' },
        { name: 'Legion',                           order: 2, approxPickupTime: '07:12 AM' },
        { name: 'National Investment Bank (NIB)',   order: 3, approxPickupTime: '07:22 AM' },
        { name: 'Vittin Barrier',                   order: 4, approxPickupTime: '07:32 AM' },
      ],
    });

    const routeJHS = await Route.create({
      name: 'JHS Route — Zogbeli to Vittin Barrier',
      pickupTime: '07:00 AM', dropoffTime: '03:00 PM',
      stops: [
        { name: 'Zogbeli (School Branch)',          order: 1, approxPickupTime: '07:00 AM' },
        { name: 'Legion',                           order: 2, approxPickupTime: '07:12 AM' },
        { name: 'National Investment Bank (NIB)',   order: 3, approxPickupTime: '07:22 AM' },
        { name: 'Tamale Teaching Hospital',         order: 4, approxPickupTime: '07:32 AM' },
        { name: 'Vittin Barrier',                   order: 5, approxPickupTime: '07:42 AM' },
      ],
    });

    await Bus.create({
      plateNumber: 'NR-PRI-26', capacity: 35,
      driver: driverMba._id, route: routePrimary._id,
    });
    await Bus.create({
      plateNumber: 'NR-JHS-26', capacity: 45,
      driver: driverCaptain._id, route: routeJHS._id,
    });

    // Demo parent guardian
    const guardianA = await Guardian.create({
      firstName: 'Mahama', lastName: 'Bawumia', relationship: 'father',
      phone: '0244999888', email: 'mahama.bawumia@gmail.com',
      occupation: 'Trader', address: 'Zogbeli, Tamale',
      momoNumber: '0244999888', momoProvider: 'mtn',
      consentDataProcessing: { granted: true, grantedAt: new Date() },
    });
    await User.create({
      email: 'parent@hanaraschools.edu.gh', phone: '0244999888',
      passwordHash: 'Parent@2026', role: 'parent',
      refGuardian: guardianA._id, isActive: true,
    });

    // 8. Generate 20 students per class
    console.log('Seeding 20 students per class...');
    const allStudents = [];
    const allGuardians = [];

    for (const cls of createdClasses) {
      const { students, guardians } = generateStudentsForClass(cls, currentYear);
      allStudents.push(...students);
      allGuardians.push(...guardians);
      console.log(`  → Generated 20 students for ${cls.name}`);
    }

    await Guardian.insertMany(allGuardians);
    await Student.insertMany(allStudents);

    const totalStudents = allStudents.length;
    const totalClasses = createdClasses.length;

    console.log(`\n🎉 Seeding successfully completed!`);
    console.log(`   Classes created : ${totalClasses} (Primary 2 – JHS 3)`);
    console.log(`   Students seeded : ${totalStudents} (20 per class)`);
    console.log(`   Guardians seeded: ${allGuardians.length}`);
    console.log(`\n   Staff accounts  :`);
    console.log(`     superadmin → admin@hanaraschools.edu.gh / Admin@2026`);
    console.log(`     admin      → abubakar@hanaraschools.edu.gh / Admin@2026`);
    console.log(`     teacher    → mariam@hanaraschools.edu.gh / Teacher@2026`);
    console.log(`     teacher    → hmohammedfareedmandeeya@gmail.com / JoshuaKimmich6`);
    console.log(`     accountant → joseph@hanaraschools.edu.gh / Accountant@2026`);
    console.log(`     parent     → parent@hanaraschools.edu.gh / Parent@2026`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seed();
