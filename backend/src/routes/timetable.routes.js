const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getMasterTimetable,
  checkClashesEndpoint,
  createSlot,
  updateSlot,
  deleteSlot,
  cloneClassTimetable,
} = require('../controllers/timetable.controller');

// Read master timetable (available to admins and teachers)
router.get('/master', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getMasterTimetable);

// Clash checker
router.post('/check-clashes', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), checkClashesEndpoint);

// CRUD on slots
router.post('/slot', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createSlot);
router.put('/slot/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), updateSlot);
router.delete('/slot/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteSlot);

// Clone class timetable
router.post('/clone-class', protect, authorize('superadmin', 'admin', 'system_admin'), cloneClassTimetable);

module.exports = router;
