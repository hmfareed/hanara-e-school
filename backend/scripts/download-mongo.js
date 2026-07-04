const { MongoMemoryServer } = require('mongodb-memory-server');

async function download() {
  console.log('Starting MongoDB pre-download...');
  try {
    const mongoServer = await MongoMemoryServer.create();
    console.log('MongoDB Binary downloaded and cached successfully!');
    console.log('Dynamic local server URI:', mongoServer.getUri());
    await mongoServer.stop();
    process.exit(0);
  } catch (err) {
    console.error('Download failed:', err);
    process.exit(1);
  }
}

download();
