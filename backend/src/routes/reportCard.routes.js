const express = require('express');
const router = express.Router();
const reportCardController = require('../controllers/reportCard.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public report card verification endpoint (for QR scans)
router.get('/verify/:token', reportCardController.verifyReportToken);

// Protected report generation endpoints
router.use(protect);
router.post('/generate-class', authorize('superadmin', 'admin', 'teacher', 'system_admin'), reportCardController.generateClassReports);

module.exports = router;
