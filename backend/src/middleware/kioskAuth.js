const crypto = require('crypto');
const { verifyAccessToken } = require('../services/token.service');
const User = require('../models/User');
const AttendanceDevice = require('../models/AttendanceDevice');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Middleware for validating Kiosk Device authentication or logged-in User session.
 * Accepts device token in X-Kiosk-Device-Token or Authorization: Bearer <token>
 */
const kioskAuth = async (req, res, next) => {
  try {
    let deviceToken = req.headers['x-kiosk-device-token'];

    // If already authenticated by previous middleware
    if (req.user) {
      req.kioskDevice = {
        deviceId: 'WEB_SESSION',
        deviceName: 'Web Session User',
        antiProxyLevel: 'standard',
        locationName: 'Web Interface',
      };
      return next();
    }

    // Check if Authorization header contains a valid user JWT
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id).select('-passwordHash -refreshTokenHash');
        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            role: user.role,
            email: user.email,
            refStaff: user.refStaff ? user.refStaff.toString() : null,
            refGuardian: user.refGuardian ? user.refGuardian.toString() : null,
            secondaryCapacities: user.secondaryCapacities || [],
            isSuperAdmin: !!user.isSuperAdmin,
          };
          req.kioskDevice = {
            deviceId: 'WEB_SESSION',
            deviceName: `User: ${user.email}`,
            antiProxyLevel: 'standard',
            locationName: 'Web Interface',
          };
          return next();
        }
      } catch (jwtErr) {
        // Not a user JWT, proceed to check as device token
        if (!deviceToken) deviceToken = token;
      }
    }

    if (!deviceToken) {
      return res.status(401).json({
        success: false,
        message: 'Kiosk device authorization header missing. Please authenticate the scanner device.',
      });
    }

    const deviceTokenHash = hashToken(deviceToken.trim());
    const device = await AttendanceDevice.findOne({ deviceTokenHash, status: 'ACTIVE' });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized kiosk device. Device token is invalid or has been revoked.',
      });
    }

    // Update lastActiveAt
    device.lastActiveAt = new Date();
    await device.save();

    req.kioskDevice = device;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = kioskAuth;
