// Diagnostic: connect directly to one Atlas shard to discover the replica set name
require('dotenv').config();
const { MongoClient } = require('mongodb');

const USER = 'mohammedfareeddev_db_user';
const PASS = 'JoshuaKimmich6';
const HOST = 'ac-rggzz72-shard-00-00.4aw02aj.mongodb.net';

async function diagnose() {
  const uri = `mongodb://${USER}:${encodeURIComponent(PASS)}@${HOST}:27017/admin?tls=true&authSource=admin&directConnection=true`;
  console.log('Connecting directly to:', HOST);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const hello = await client.db('admin').command({ hello: 1 });
    console.log('✅ Connected!');
    console.log('Replica set name :', hello.setName);
    console.log('Hosts            :', hello.hosts);
    console.log('Primary          :', hello.primary);
    await client.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

diagnose();
