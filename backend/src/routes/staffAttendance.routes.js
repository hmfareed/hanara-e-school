const express = require('express');
const router = express.Router();
const {
  getGeofenceSettingsHandler,
  updateGeofenceSettings,
  getMyStatus,
  checkIn,
  checkOut,
  getAdminDailyOverview,
  adminBulkMark,
  getAdminHistory,
} = require('../controllers/staffAttendance.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const ADMIN_ROLES = ['superadmin', 'admin', 'system_admin'];
const ALL_STAFF_ROLES = ['superadmin', 'admin', 'system_admin', 'teacher', 'accountant'];

// ── Geofence settings ─────────────────────────────────────────────────────────
router.get('/geofence-settings', protect, authorize(...ALL_STAFF_ROLES), getGeofenceSettingsHandler);
router.patch('/geofence-settings', protect, authorize(...ADMIN_ROLES), updateGeofenceSettings);

// ── Self-service (staff only, no cross-marking) ───────────────────────────────
router.get('/my-status', protect, authorize(...ALL_STAFF_ROLES), getMyStatus);
router.post('/check-in', protect, authorize(...ALL_STAFF_ROLES), checkIn);
router.post('/check-out', protect, authorize(...ALL_STAFF_ROLES), checkOut);

// ── Admin-only endpoints ──────────────────────────────────────────────────────
router.get('/admin/daily', protect, authorize(...ADMIN_ROLES), getAdminDailyOverview);
router.post('/admin/bulk', protect, authorize(...ADMIN_ROLES), adminBulkMark);
router.get('/admin/history', protect, authorize(...ADMIN_ROLES), getAdminHistory);

module.exports = router;
