require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../src/models/Staff');
const Subject = require('../src/models/Subject');
const env = require('../src/config/env');

async function cleanBlanks() {
  try {
    const mongoUri = env.MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hanara-sms';
    await mongoose.connect(mongoUri);
    console.log('Connected to database to clean blanks...');

    // 1. Clean blank / invalid staff
    const blankStaffResult = await Staff.deleteMany({
      $or: [
        { firstName: { $in: ['', null, undefined] } },
        { lastName: { $in: ['', null, undefined] } },
        { firstName: /^\s*$/ },
        { lastName: /^\s*$/ },
      ],
    });
    console.log(`Deleted ${blankStaffResult.deletedCount} blank staff members.`);

    // 2. Clean blank / invalid subjects
    const blankSubjectResult = await Subject.deleteMany({
      $or: [
        { name: { $in: ['', null, undefined] } },
        { code: { $in: ['', null, undefined] } },
        { name: /^\s*$/ },
        { code: /^\s*$/ },
      ],
    });
    console.log(`Deleted ${blankSubjectResult.deletedCount} blank subjects.`);

    console.log('Cleanup completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err.message);
    process.exit(1);
  }
}

cleanBlanks();
