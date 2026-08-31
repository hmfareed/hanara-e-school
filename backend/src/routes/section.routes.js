const express = require('express');
const router = express.Router();
const {
  getSectionsSummary,
  getSectionDetails,
  assignTeacherToSection,
  assignStudentsToSection,
  autoBalanceSections,
} = require('../controllers/section.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All authenticated roles (admin, superadmin, teacher, system_admin, accountant) can view section summaries
router.get('/summary', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getSectionsSummary);

// Section detail / roster
router.get('/:color', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getSectionDetails);

// Actions: assign teacher, batch assign students, auto balance (superadmin, admin, system_admin)
router.post('/assign-teacher', protect, authorize('superadmin', 'admin', 'system_admin'), assignTeacherToSection);
router.post('/assign-students', protect, authorize('superadmin', 'admin', 'system_admin'), assignStudentsToSection);
router.post('/auto-balance', protect, authorize('superadmin', 'admin', 'system_admin'), autoBalanceSections);

module.exports = router;
