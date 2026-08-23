require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4,
    });
    console.log('Connected to MongoDB.');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n--- COLLECTION COUNTS ---');
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`${c.name}: ${count}`);
    }

    console.log('\n--- CLASSES DETAILS ---');
    const classes = await db.collection('classes').find({}).toArray();
    console.log(`Total classes found: ${classes.length}`);
    for (const cls of classes.slice(0, 15)) {
      console.log(`Class ID: ${cls._id}, name: "${cls.name}", level: ${cls.level}, academicYear: ${cls.academicYear}, teacher: ${cls.classTeacher}`);
    }
    if (classes.length > 15) {
      console.log(`... and ${classes.length - 15} more classes`);
    }

    console.log('\n--- USERS DETAILS ---');
    const users = await db.collection('users').find({}).toArray();
    for (const u of users) {
      console.log(`User: ${u.email} (${u.role}) - active: ${u.isActive}, approval: ${u.approvalStatus}`);
    }

    console.log('\n--- STAFF DETAILS ---');
    const staff = await db.collection('staff').find({}).toArray();
    for (const s of staff) {
      console.log(`Staff: ${s.firstName} ${s.lastName} (${s.role}) - email: ${s.email}`);
    }

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
