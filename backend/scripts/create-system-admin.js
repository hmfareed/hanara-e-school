require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment');
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    const email = 'sysadmin@hanaraschools.edu.gh';
    const password = 'Admin@2026';

    // Delete existing sysadmin if any
    await User.deleteMany({ email });

    // Create system_admin user
    const user = await User.create({
      email,
      phone: '0244111222',
      passwordHash: password, // Note: User model pre-save hook will hash this automatically
      role: 'system_admin',
      isSuperAdmin: true,
      isActive: true,
      approvalStatus: 'approved'
    });

    console.log('Successfully created system_admin account:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Password: ${password}`);
    console.log(`- Role: ${user.role}`);
  } catch (e) {
    console.error('Error creating system admin:', e);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();
