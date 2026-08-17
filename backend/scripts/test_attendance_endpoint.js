require('dotenv').config();
const mongoose = require('mongoose');

async function testAttendance() {
  await mongoose.connect(process.env.MONGODB_URI);
  const { getAttendance } = require('../src/controllers/attendance.controller');

  const req = {
    user: {
      id: '6a7e91016ea8f9e8daf0ee21',
      _id: '6a7e91016ea8f9e8daf0ee21',
      role: 'teacher',
      email: 'hmohammedfareedmandeeya@gmail.com',
      refStaff: '6a7e91006ea8f9e8daf0ee1f'
    },
    query: {
      class: '6a7e91306ea8f9e8daf0ee37',
      date: '2026-08-16'
    }
  };

  const res = {
    json: function(payload) {
      console.log('--- getAttendance Response ---');
      console.log('success:', payload.success);
      console.log('register length:', payload.data?.register?.length);
      console.log('summary:', payload.data?.summary);
      console.log('sample item:', payload.data?.register?.[0]);
    },
    status: function(code) {
      console.log('status code:', code);
      return this;
    }
  };

  const next = function(err) {
    console.error('Error in getAttendance:', err);
  };

  await getAttendance(req, res, next);
  await mongoose.disconnect();
}

testAttendance().catch(console.error);
