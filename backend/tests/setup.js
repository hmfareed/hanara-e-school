const path = require('path');
const os = require('os');
const fs = require('fs');

// ── Point MMS at the already-cached mongod binary so it never tries to download ──
// The binary was previously downloaded to the user cache; we pin the version so
// the library uses it directly instead of attempting a fresh (and failing) download.
const cachedBinary = path.join(
  os.homedir(),
  '.cache',
  'mongodb-binaries',
  'mongod-x64-win32-8.2.1.exe'
);
if (fs.existsSync(cachedBinary)) {
  process.env.MONGOMS_SYSTEM_BINARY = cachedBinary;
}
// Fallback: pin the version even if binary path not found (avoids downloading 8.2.6)
process.env.MONGOMS_VERSION = '8.2.1';

// These MUST come after the MONGOMS_* vars but before importing mongodb-memory-server
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Configure environment variables for test execution
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'hanara_schools_access_secret_jwt_2026_tamale_ghana_test_key_long';
process.env.JWT_REFRESH_SECRET = 'hanara_schools_refresh_secret_jwt_2026_tamale_ghana_test_key_long';
process.env.PORT = '5001';

let mongoServer;

beforeAll(async () => {
  console.log('\n[JEST SETUP] Starting in-memory MongoDB server...');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  console.log('[JEST SETUP] In-memory MongoDB server started & connected.');
});

afterAll(async () => {
  console.log('\n[JEST TEARDOWN] Closing connection and stopping database...');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('[JEST TEARDOWN] Database cleanup complete.');
});
