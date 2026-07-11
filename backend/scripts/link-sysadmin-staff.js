require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');

async function linkAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment');
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    const email = 'sysadmin@hanaraschools.edu.gh';
    
    // Find the system_admin user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('system_admin user not found! Please run the create-system-admin script first.');
      return;
    }

    let staffId = user.refStaff;

    // Check if staff profile already exists
    let staff = null;
    if (staffId) {
      staff = await Staff.findById(staffId);
    } else {
      staff = await Staff.findOne({ email });
    }

    if (!staff) {
      console.log('Staff profile not found. Creating a new Staff profile...');
      staff = await Staff.create({
        title: 'Mr',
        firstName: 'System',
        lastName: 'Admin',
        gender: 'male',
        phone: user.phone || '0244111222',
        email: email,
        role: 'teacher', // Set as teacher so they show up in teachers list for assignments
        employmentStatus: 'active',
        employmentDate: new Date(),
        qualification: 'B.Ed. Computer Science',
        address: 'Zogbeli, Tamale'
      });
      console.log('Created Staff profile with ID:', staff._id);
    } else {
      console.log('Found existing Staff profile with ID:', staff._id);
      // Ensure the staff role is 'teacher' so they show up in teachers dropdowns
      staff.role = 'teacher';
      await staff.save();
    }

    // Link staff to user and configure secondary capacities
    user.refStaff = staff._id;
    user.secondaryCapacities = ['teacher'];
    await user.save({ validateBeforeSave: false });

    console.log('Successfully updated system_admin User account:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Linked refStaff ID: ${user.refStaff}`);
    console.log(`- Secondary Capacities:`, user.secondaryCapacities);
  } catch (e) {
    console.error('Error linking system admin staff profile:', e);
  } finally {
    await mongoose.connection.close();
  }
}

linkAdmin();
