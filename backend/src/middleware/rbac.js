const Staff = require('../models/Staff');
const logger = require('../utils/logger');

/**
 * authorize(...roles)
 * Usage: router.get('/route', protect, authorize('admin', 'superadmin'), handler)
 * Returns 403 if req.user.role is not in the allowed list.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to perform this action`,
      });
    }
    next();
  };
};

/**
 * authorizeClassAccess
 * Enforces that a teacher can only access their assigned class's data.
 * Reads classId from req.params.classId or req.query.class or req.body.class.
 *
 * - superadmin and admin bypass this check
 * - teacher must have the requested classId in their Staff.classesAssigned
 */
const authorizeClassAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { role, refStaff } = req.user;

    // Admins and super admins see everything
    if (role === 'superadmin' || role === 'admin' || role === 'accountant') {
      return next();
    }

    // Teachers and subject teachers, or system_admin acting in teaching capacity: check class assignment
    if (role === 'teacher' || (role === 'system_admin' && req.user.secondaryCapacities && req.user.secondaryCapacities.includes('teacher'))) {
      const classId =
        req.params.classId ||
        req.query.class ||
        req.body.class ||
        req.query.classId ||
        req.body.classId;

      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'classId is required for this request',
        });
      }

      if (!refStaff) {
        return res.status(403).json({
          success: false,
          message: 'No staff profile linked to this account',
        });
      }

      const staff = await Staff.findById(refStaff).select('classesAssigned');
      if (!staff) {
        return res.status(403).json({
          success: false,
          message: 'Staff profile not found',
        });
      }

      const assignedIds = staff.classesAssigned.map((id) => id.toString());
      if (!assignedIds.includes(classId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this class',
        });
      }

      return next();
    }

    // All other roles: deny
    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  } catch (error) {
    logger.error('authorizeClassAccess error:', error);
    next(error);
  }
};

module.exports = { authorize, authorizeClassAccess };
