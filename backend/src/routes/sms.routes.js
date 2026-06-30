const express = require('express');
const router = express.Router();
const { broadcastSms, getSmsLogs, getSmsStats } = require('../controllers/sms.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Only superadmins and admins can manage SMS settings/broadcasts
router.post('/broadcast', protect, authorize('superadmin', 'admin'), broadcastSms);
router.get('/logs', protect, authorize('superadmin', 'admin'), getSmsLogs);
router.get('/stats', protect, authorize('superadmin', 'admin'), getSmsStats);

module.exports = router;
