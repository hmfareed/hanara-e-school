const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed on app termination');
  process.exit(0);
});

module.exports = connectDB;
