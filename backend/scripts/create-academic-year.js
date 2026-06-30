// Lightweight script: just create an active academic year (no data deletion)
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const mongoose = require('mongoose');
const AcademicYear = require('../src/models/AcademicYear');

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not defined in .env');

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // Check if an active year already exists
    const existing = await AcademicYear.findOne({ isCurrent: true });
    if (existing) {
      console.log(`Active academic year already exists: "${existing.name}"`);
      console.log('Nothing to do. Exiting.');
      process.exit(0);
    }

    // Check if ANY year exists — if so, just mark the newest as current
    const any = await AcademicYear.findOne().sort({ createdAt: -1 });
    if (any) {
      any.isCurrent = true;
      await any.save();
      console.log(`Marked existing year "${any.name}" as current. Done.`);
      process.exit(0);
    }

    // No years exist at all — create one
    const year = await AcademicYear.create({
      name: '2026/2027',
      isCurrent: true,
      terms: [
        { name: 'Term 1', startDate: new Date('2026-09-08'), endDate: new Date('2026-12-18') },
        { name: 'Term 2', startDate: new Date('2027-01-12'), endDate: new Date('2027-04-16') },
        { name: 'Term 3', startDate: new Date('2027-05-11'), endDate: new Date('2027-08-20') },
      ],
    });
    console.log(`Created academic year: "${year.name}" (isCurrent: true). Done.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
