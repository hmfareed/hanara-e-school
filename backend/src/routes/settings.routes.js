const express = require('express');
const router = express.Router();
const {
  getSchoolProfile,
  updateSchoolProfile,
  getSystemUsers,
  toggleUserActive,
} = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// School profile routes
router.get('/school-profile', protect, authorize('superadmin', 'admin'), getSchoolProfile);
router.patch('/school-profile', protect, authorize('superadmin'), updateSchoolProfile);

// System users routes (superadmin only)
router.get('/users', protect, authorize('superadmin'), getSystemUsers);
router.patch('/users/:userId/toggle-active', protect, authorize('superadmin'), toggleUserActive);

module.exports = router;
