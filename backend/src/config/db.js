const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.error('MONGODB_URI is not defined in environment');
      isConnecting = false;
      return;
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
      family: 4,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection attempt failed: ${error.message}. Retrying in 5s...`);
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 5000);
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Retrying connection in 5s...');
  setTimeout(() => connectDB(), 5000);
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed on app termination');
  process.exit(0);
});

module.exports = connectDB;
