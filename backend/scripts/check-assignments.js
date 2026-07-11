require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const ClassSubjectAssignment = require('../src/models/ClassSubjectAssignment');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const AcademicYear = require('../src/models/AcademicYear');

async function check() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const users = await User.find({});
    console.log('\n--- USERS ---');
    for (const u of users) {
      console.log(`Email: ${u.email}, Role: ${u.role}, refStaff: ${u.refStaff}`);
    }

    const assignments = await ClassSubjectAssignment.find({})
      .populate('class')
      .populate('subject')
      .populate('teacher')
      .populate('academicYear');

    console.log('\n--- CLASS SUBJECT ASSIGNMENTS ---');
    for (const a of assignments) {
      console.log(`Class: ${a.class?.name} (${a.class?._id})`);
      console.log(`Subject: ${a.subject?.name} (${a.subject?.code})`);
      console.log(`Teacher: ${a.teacher?.firstName} ${a.teacher?.lastName} (${a.teacher?._id})`);
      console.log(`AcademicYear: ${a.academicYear?.name} (${a.academicYear?._id})`);
      console.log('------------------------');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

check();
