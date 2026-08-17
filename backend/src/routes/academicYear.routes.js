const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  setCurrentYear,
  deleteAcademicYear,
  getRolloverPreview,
  executeRollover,
  getRolloverHistory,
} = require('../controllers/academicYear.controller');

// All authenticated users can read academic years (needed by dropdowns)
router.get('/', protect, listAcademicYears);

// Rollover & Promotion routes (must be defined before /:id)
router.get('/rollover/preview', protect, authorize('superadmin', 'admin'), getRolloverPreview);
router.post('/rollover/execute', protect, authorize('superadmin', 'admin'), executeRollover);
router.get('/rollover/history', protect, authorize('superadmin', 'admin'), getRolloverHistory);

router.get('/:id', protect, getAcademicYearById);

// Only admins can create/update/delete academic years
router.post('/', protect, authorize('superadmin', 'admin'), createAcademicYear);
router.patch('/:id', protect, authorize('superadmin', 'admin'), updateAcademicYear);
router.patch('/:id/set-current', protect, authorize('superadmin', 'admin'), setCurrentYear);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteAcademicYear);

module.exports = router;

