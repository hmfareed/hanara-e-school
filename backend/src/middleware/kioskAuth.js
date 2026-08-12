const crypto = require('crypto');
const AttendanceDevice = require('../models/AttendanceDevice');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Middleware for validating Kiosk Device authentication.
 * Accepts device token in X-Kiosk-Device-Token or Authorization: Bearer <deviceToken>
 */
const kioskAuth = async (req, res, next) => {
  try {
    let deviceToken = req.headers['x-kiosk-device-token'];

    if (!deviceToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      deviceToken = req.headers.authorization.split(' ')[1];
    }

    // If request comes from an authenticated user (e.g. admin or staff logged into web app), allow request
    if (req.user) {
      req.kioskDevice = {
        deviceId: 'WEB_SESSION',
        deviceName: 'Web Session User',
        antiProxyLevel: 'standard',
        locationName: 'Web Interface',
      };
      return next();
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
