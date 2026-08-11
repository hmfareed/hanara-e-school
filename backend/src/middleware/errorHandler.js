const logger = require('../utils/logger');

/**
 * Centralized error handler.
 * Translates Mongoose validation errors, JWT errors, and Zod errors
 * to consistent JSON responses.
 *
 * IMPORTANT: Internal error messages (MongoDB, DNS, etc.) are NEVER
 * sent to the client for 5xx responses. Only safe, generic messages are used.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  // Default: use err.message only for client errors (4xx).
  // Server errors (5xx) get a safe generic message — never expose internals.
  let message = statusCode < 500 ? (err.message || 'Request failed') : 'Internal Server Error';
  let errors = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = [err.errors[key].message];
      return acc;
    }, {});
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  // MongoDB connection / DNS errors — return 503 with safe message
  if (
    err.name === 'MongoNetworkError' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.message?.includes('ENOTFOUND') ||
    err.message?.includes('MongoServerSelectionError') ||
    err.message?.includes('getaddrinfo')
  ) {
    statusCode = 503;
    message = 'Service temporarily unavailable. Please try again later.';
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} → ${statusCode}`, {
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    // Never expose stack traces — not even in development via API
  });
};

module.exports = errorHandler;

