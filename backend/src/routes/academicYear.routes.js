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
} = require('../controllers/academicYear.controller');

// All authenticated users can read academic years (needed by dropdowns)
router.get('/', protect, listAcademicYears);
router.get('/:id', protect, getAcademicYearById);

// Only admins can create/update/delete academic years
router.post('/', protect, authorize('superadmin', 'admin'), createAcademicYear);
router.patch('/:id', protect, authorize('superadmin', 'admin'), updateAcademicYear);
router.patch('/:id/set-current', protect, authorize('superadmin', 'admin'), setCurrentYear);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteAcademicYear);

module.exports = router;

