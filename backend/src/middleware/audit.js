const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * auditLogger middleware
 * Hooks into the response finish event to write to AuditLog if req.auditInfo is present.
 */
const auditLogger = (req, res, next) => {
  res.on('finish', async () => {
    try {
      // Log only on successful responses when audit info was attached
      if (res.statusCode >= 200 && res.statusCode < 300 && req.auditInfo) {
        const { action, targetType, targetId, beforeValue, afterValue, severity = 'info' } = req.auditInfo;

        if (!req.user) {
          logger.warn('Audit logger triggered but no req.user context found');
          return;
        }

        // Check if acting capacity is teacher or admin
        // By default, if they are system_admin and accessing a teacher resource/route, it is 'teacher'.
        // In other cases, they act as their primary role.
        let actingAs = null;
        if (req.user.role === 'system_admin') {
          // If the action is academic (e.g. grade, attendance), tag as teacher
          if (action.startsWith('grade.') || action.startsWith('attendance.')) {
            actingAs = 'teacher';
          } else {
            actingAs = 'admin';
          }
        }

        await AuditLog.create({
          actorId: req.user.id,
          actorRole: req.user.role,
          actingAs,
          action,
          targetType,
          targetId,
          beforeValue,
          afterValue,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
          severity,
        });
      }
    } catch (err) {
      logger.error('Error saving AuditLog:', err);
    }
  });
  next();
};

module.exports = auditLogger;
