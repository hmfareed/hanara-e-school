const express = require('express');
const router = express.Router();
const {
  getStaff,
  createStaff,
  getStaffById,
  updateStaff,
  assignClasses,
  generateRegistrationCode,
  getRegistrationCode,
  getWaitlist,
  approveStaff,
  rejectStaff,
} = require('../controllers/staff.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createStaffSchema, updateStaffSchema } = require('../validators/staff.validators');

// Registration code management (superadmin only)
router.post('/registration-code', protect, authorize('superadmin'), generateRegistrationCode);
router.get('/registration-code', protect, authorize('superadmin'), getRegistrationCode);

// Waitlist management (superadmin only)
router.get('/waitlist', protect, authorize('superadmin'), getWaitlist);
router.post('/waitlist/:userId/approve', protect, authorize('superadmin'), approveStaff);
router.post('/waitlist/:userId/reject', protect, authorize('superadmin'), rejectStaff);

// Standard staff CRUD
router.get('/', protect, authorize('superadmin', 'admin'), getStaff);
router.post('/', protect, authorize('superadmin', 'admin'), validate(createStaffSchema), createStaff);
router.get('/:id', protect, authorize('superadmin', 'admin'), getStaffById);
router.patch('/:id', protect, authorize('superadmin', 'admin'), validate(updateStaffSchema), updateStaff);
router.post('/:id/assign-classes', protect, authorize('superadmin', 'admin'), assignClasses);

module.exports = router;

