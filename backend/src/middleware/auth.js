const { verifyAccessToken } = require('../services/token.service');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * protect — verifies the JWT access token from Authorization header.
 * Attaches req.user = { id, role, email, refStaff } on success.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated — no token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash -refreshTokenHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not found or inactive' });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      refStaff: user.refStaff ? user.refStaff.toString() : null,
      refGuardian: user.refGuardian ? user.refGuardian.toString() : null,
      secondaryCapacities: user.secondaryCapacities || [],
      isSuperAdmin: !!user.isSuperAdmin,
    };

    next();
  } catch (error) {
    logger.error('protect middleware error:', error);
    next(error);
  }
};

const softProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return next();
    }

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
    }
    next();
  } catch (error) {
    logger.error('softProtect middleware error:', error);
    next(error);
  }
};

module.exports = { protect, softProtect };
