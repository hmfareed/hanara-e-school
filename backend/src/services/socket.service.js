const { Server } = require('socket.io');
const { verifyAccessToken } = require('./token.service');
const User = require('../models/User');
const logger = require('../utils/logger');

let io = null;

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
  });

  // Socket.io Middleware for JWT authentication
  io.use(async (socket, next) => {
    try {
      // Token can be passed in auth or headers
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        return next(new Error('Authentication error: Token invalid or expired'));
      }

      const user = await User.findById(decoded.id).select('-passwordHash -refreshTokenHash');
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User account not found or inactive'));
      }

      // Attach simple user details to socket
      socket.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        refStaff: user.refStaff ? user.refStaff.toString() : null,
        secondaryCapacities: user.secondaryCapacities || [],
      };

      next();
    } catch (error) {
      logger.error('Socket authentication middleware error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.email}, Role: ${socket.user.role})`);

    // Accountants, Admins, and Superadmins join a school-wide accountants room
    const adminRoles = ['accountant', 'admin', 'superadmin', 'system_admin'];
    if (adminRoles.includes(socket.user.role)) {
      socket.join('accountants');
      logger.info(`Socket ${socket.id} joined 'accountants' room`);
    }

    // Individual room for specific form teacher
    socket.join(`user:${socket.user.id}`);
    logger.info(`Socket ${socket.id} joined room 'user:${socket.user.id}'`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

const emitToAccountants = (event, data) => {
  if (io) {
    io.to('accountants').emit(event, data);
    logger.info(`Emitted real-time event '${event}' to accountants room`);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    logger.info(`Emitted real-time event '${event}' to user ${userId}`);
  }
};

module.exports = {
  init,
  getIO,
  emitToAccountants,
  emitToUser,
};
