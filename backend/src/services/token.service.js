const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a short-lived access token (15 min by default)
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

/**
 * Signs a long-lived refresh token (7 days by default)
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Verifies an access token and returns its decoded payload
 * Throws if invalid or expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verifies a refresh token and returns its decoded payload
 * Throws if invalid or expired
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
