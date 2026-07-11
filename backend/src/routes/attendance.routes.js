const express = require('express');
const router = express.Router();
const {
  getAttendance,
  bulkMarkAttendance,
  getStudentAttendanceSummary,
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { requireFormTeacherForClass } = require('../middleware/assignmentAuth');
const { validate } = require('../middleware/validate');
const { bulkAttendanceSchema } = require('../validators/attendance.validators');

// Only form teachers / class teachers can access and submit the attendance register
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacherForClass, getAttendance);
router.post('/bulk', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacherForClass, validate(bulkAttendanceSchema), bulkMarkAttendance);
router.get('/student/:id/summary', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getStudentAttendanceSummary);

module.exports = router;
