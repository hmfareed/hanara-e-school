const express = require('express');
const router = express.Router();
const {
  scanQr,
  syncOfflineScans,
  getStaffQrHandler,
  generateStaffQrHandler,
  revokeStaffQrHandler,
  getDevices,
  createDevice,
  updateDevice,
  getSessions,
  createSession,
  updateSession,
  correctAttendanceRecord,
  getAttendanceEvents,
  getAttendanceReports,
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
const kioskAuth = require('../middleware/kioskAuth');

const ADMIN_ROLES = ['superadmin', 'admin', 'system_admin'];
const ALL_STAFF_ROLES = ['superadmin', 'admin', 'system_admin', 'teacher', 'accountant'];

// ── Kiosk Scanner API Endpoints (device authenticated or web session) ─────────
router.post('/scan', kioskAuth, scanQr);
router.post('/sync', kioskAuth, syncOfflineScans);

// ── Staff QR Credentials ──────────────────────────────────────────────────────
router.get('/staff/:id/qr', protect, authorize(...ALL_STAFF_ROLES), getStaffQrHandler);
router.post('/staff/:id/qr/generate', protect, authorize(...ADMIN_ROLES), generateStaffQrHandler);
router.post('/staff/:id/qr/revoke', protect, authorize(...ADMIN_ROLES), revokeStaffQrHandler);

// ── Devices Management ───────────────────────────────────────────────────────
router.get('/devices', protect, authorize(...ADMIN_ROLES), getDevices);
router.post('/devices', protect, authorize(...ADMIN_ROLES), createDevice);
router.patch('/devices/:id', protect, authorize(...ADMIN_ROLES), updateDevice);

// ── Sessions Configuration ───────────────────────────────────────────────────
router.get('/sessions', protect, authorize(...ADMIN_ROLES), getSessions);
router.post('/sessions', protect, authorize(...ADMIN_ROLES), createSession);
router.patch('/sessions/:id', protect, authorize(...ADMIN_ROLES), updateSession);

// ── Manual Corrections & Audit Events ────────────────────────────────────────
router.post('/records/:id/correct', protect, authorize(...ADMIN_ROLES), correctAttendanceRecord);
router.get('/events', protect, authorize(...ADMIN_ROLES), getAttendanceEvents);
router.get('/reports', protect, authorize(...ADMIN_ROLES), getAttendanceReports);

// ── Geofence Settings ────────────────────────────────────────────────────────
router.get('/geofence-settings', protect, authorize(...ALL_STAFF_ROLES), getGeofenceSettingsHandler);
router.patch('/geofence-settings', protect, authorize(...ADMIN_ROLES), updateGeofenceSettings);

// ── Self-service check-in ─────────────────────────────────────────────────────
router.get('/my-status', protect, authorize(...ALL_STAFF_ROLES), getMyStatus);
router.post('/check-in', protect, authorize(...ALL_STAFF_ROLES), checkIn);
router.post('/check-out', protect, authorize(...ALL_STAFF_ROLES), checkOut);

// ── Admin-only overview ───────────────────────────────────────────────────────
router.get('/admin/daily', protect, authorize(...ADMIN_ROLES), getAdminDailyOverview);
router.post('/admin/bulk', protect, authorize(...ADMIN_ROLES), adminBulkMark);
router.get('/admin/history', protect, authorize(...ADMIN_ROLES), getAdminHistory);

module.exports = router;
