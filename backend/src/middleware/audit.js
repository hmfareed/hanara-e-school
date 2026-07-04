/**
 * audit.js
 *
 * Lightweight helper to write immutable audit log entries for DPC compliance.
 *
 * Usage in controllers:
 *   const { logAction } = require('../middleware/audit');
 *   await logAction(req, 'FINALIZE_REPORT_CARD', 'StudentReport', report._id, null, report);
 */

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * logAction(req, action, entityType, entityId, before, after)
 *
 * @param {Object}   req        - Express request (used for actor id and IP)
 * @param {string}   action     - Uppercase action name e.g. 'UPDATE_STUDENT'
 * @param {string}   entityType - Model name e.g. 'Student', 'Invoice'
 * @param {*}        entityId   - The affected document's _id
 * @param {Object}   before     - Snapshot of the document before the change (null for create)
 * @param {Object}   after      - Snapshot of the document after the change (null for delete)
 */
async function logAction(req, action, entityType, entityId, before = null, after = null) {
  try {
    const actorId = req?.user?.id || req?.user?._id;
    if (!actorId) {
      logger.warn(`[Audit] Skipped logging ${action} — no actor in request`);
      return;
    }

    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      '';

    const userAgent = req.headers['user-agent'] || '';

    await AuditLog.create({
      actor: actorId,
      action,
      entityType,
      entityId,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      ip,
      userAgent,
    });
  } catch (err) {
    // Audit failures must never break the main request flow — log and continue
    logger.error(`[Audit] Failed to write audit log for ${action}: ${err.message}`);
  }
}

module.exports = { logAction };
