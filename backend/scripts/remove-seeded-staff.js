require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');
const ClassSubjectAssignment = require('../src/models/ClassSubjectAssignment');
const SubjectAssignment = require('../src/models/SubjectAssignment');

async function removeStaff() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment');
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    // Targets
    const staffNames = [
      { first: 'Abubakar', last: 'Sadik' },
      { first: 'Mariam', last: 'Issah' }
    ];

    for (const name of staffNames) {
      console.log(`\nProcessing: ${name.first} ${name.last}`);
      const staffDoc = await Staff.findOne({
        firstName: name.first,
        lastName: name.last
      });

      if (staffDoc) {
        console.log(`Found Staff ID: ${staffDoc._id}`);

        // Clear classTeacher fields in Class collection
        const updatedClasses = await Class.updateMany(
          { classTeacher: staffDoc._id },
          { $set: { classTeacher: null } }
        );
        console.log(`Cleared classTeacher fields in Class: updated ${updatedClasses.modifiedCount} classes`);

        // Remove from ClassSubjectAssignment
        const deletedClassSub = await ClassSubjectAssignment.deleteMany({
          teacher: staffDoc._id
        });
        console.log(`Deleted ClassSubjectAssignment entries: ${deletedClassSub.deletedCount}`);

        // Find linked user
        const userDoc = await User.findOne({ refStaff: staffDoc._id });
        if (userDoc) {
          console.log(`Found linked User ID: ${userDoc._id}`);

          // Remove from SubjectAssignment
          const deletedSub = await SubjectAssignment.deleteMany({
            teacher: userDoc._id
          });
          console.log(`Deleted SubjectAssignment entries: ${deletedSub.deletedCount}`);

          // Delete User
          await User.deleteOne({ _id: userDoc._id });
          console.log('Deleted User document.');
        }

        // Delete Staff
        await Staff.deleteOne({ _id: staffDoc._id });
        console.log('Deleted Staff document.');
      } else {
        console.log(`Staff ${name.first} ${name.last} not found.`);
      }
    }

    console.log('\nStaff removal completed successfully.');
  } catch (error) {
    console.error('Error removing staff:', error);
  } finally {
    await mongoose.connection.close();
  }
}

removeStaff();
