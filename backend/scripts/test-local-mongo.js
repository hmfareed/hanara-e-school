const mongoose = require('mongoose');
async function test() {
  try {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/hanara_sms_test', { serverSelectionTimeoutMS: 2000 });
    console.log('Success! Local MongoDB is running.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Local MongoDB is NOT running:', err.message);
    process.exit(1);
  }
}
test();
