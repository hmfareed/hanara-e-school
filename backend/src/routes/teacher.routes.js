const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getTeacherLoad,
  getTeacherProfile,
  getTeacherDashboardSummary,
  getMyClasses,
  getMyClassDetails,
  getClassPendingTasks,
  updateTeacherProfile,
  getTeacherTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} = require('../controllers/teacher.controller');

// Profile & Summary endpoints
router.get('/profile', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherProfile);
router.put('/profile/update', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), updateTeacherProfile);
router.get('/dashboard-summary', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherDashboardSummary);
router.get('/dashboard', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherDashboardSummary);
router.get('/summary', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherDashboardSummary);

// Timetable Management endpoints
router.get('/timetable', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherTimetable);
router.post('/timetable', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createTimetableEntry);
router.put('/timetable/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), updateTimetableEntry);
router.delete('/timetable/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteTimetableEntry);

// Class Workspace endpoints
router.get('/my-classes', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getMyClasses);
router.get('/my-classes/:classId/pending-tasks', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getClassPendingTasks);
router.get('/my-classes/:classId', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getMyClassDetails);

// Authenticated users (admin/superadmin or teacher) can load teacher load
router.get('/:id/load', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getTeacherLoad);

module.exports = router;


