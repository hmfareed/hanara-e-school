require('dotenv').config();
const mongoose = require('mongoose');
const ClassLevel = require('../src/models/ClassLevel');
const Subject = require('../src/models/Subject');

const ensureSubjects = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in environment');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to database.');

    // Fetch all ClassLevels
    const levels = await ClassLevel.find();
    
    // Filter level IDs
    const primaryLevels = levels
      .filter(l => ['PRI1', 'PRI2', 'PRI3', 'PRI4', 'PRI5', 'PRI6'].includes(l.levelCode))
      .map(l => l._id);
      
    const jhsLevels = levels
      .filter(l => ['JHS1', 'JHS2', 'JHS3'].includes(l.levelCode))
      .map(l => l._id);

    const primaryAndJhsLevels = [...primaryLevels, ...jhsLevels];

    // Subjects list matching user request
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'English', code: 'ENG', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Science', code: 'SCI', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'History', code: 'HIST', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Creative Arts', code: 'CRART', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Religious and Moral Education', code: 'RME', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Computing', code: 'COMP', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Dagbani', code: 'DAG', type: 'subject', appliesToLevels: primaryAndJhsLevels },
      { name: 'Career Technology', code: 'CARTECH', type: 'subject', appliesToLevels: jhsLevels },
    ];

    console.log('Upserting subjects into database...');
    for (const subj of subjectsData) {
      const existing = await Subject.findOne({ code: subj.code });
      if (existing) {
        existing.name = subj.name;
        existing.appliesToLevels = subj.appliesToLevels;
        existing.type = subj.type;
        await existing.save();
        console.log(`Updated subject: ${subj.name} (${subj.code})`);
      } else {
        await Subject.create(subj);
        console.log(`Created subject: ${subj.name} (${subj.code})`);
      }
    }

    console.log('Subjects database setup completed successfully.');
  } catch (error) {
    console.error('Error ensuring subjects:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

ensureSubjects();
