require('dotenv').config();

// Configure environment variables for test execution
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/hanara_sms_test';
process.env.JWT_ACCESS_SECRET = 'hanara_schools_access_secret_jwt_2026_tamale_ghana_test_key_long';
process.env.JWT_REFRESH_SECRET = 'hanara_schools_refresh_secret_jwt_2026_tamale_ghana_test_key_long';
process.env.PORT = '5001';
console.log('\n[JEST SETUP] Test environment initialized.');

