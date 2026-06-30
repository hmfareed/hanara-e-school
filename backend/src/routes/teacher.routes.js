const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { getTeacherLoad } = require('../controllers/teacher.controller');

// Authenticated users (admin/superadmin or teacher) can load teacher load
router.get('/:id/load', protect, authorize('superadmin', 'admin', 'teacher'), getTeacherLoad);

module.exports = router;
