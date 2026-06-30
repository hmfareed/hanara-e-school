require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function check() {
  try {
    console.log('Connecting to', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    
    const users = await User.find({}).select('+passwordHash');
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`- Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Active: ${u.isActive}`);
      console.log(`  ApprovalStatus: ${u.approvalStatus}`);
      console.log(`  PasswordHash: ${u.passwordHash}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

check();
