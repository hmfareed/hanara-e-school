const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/summary', protect, authorize('superadmin', 'admin', 'teacher', 'accountant'), getSummary);

module.exports = router;
