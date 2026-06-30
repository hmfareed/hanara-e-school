const express = require('express');
const router = express.Router();
const {
  getAttendance,
  bulkMarkAttendance,
  getStudentAttendanceSummary,
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth');
const { authorize, authorizeClassAccess } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { bulkAttendanceSchema } = require('../validators/attendance.validators');

router.get('/', protect, authorize('superadmin', 'admin', 'teacher'), authorizeClassAccess, getAttendance);
router.post('/bulk', protect, authorize('superadmin', 'admin', 'teacher'), authorizeClassAccess, validate(bulkAttendanceSchema), bulkMarkAttendance);
router.get('/student/:id/summary', protect, authorize('superadmin', 'admin', 'teacher', 'accountant'), getStudentAttendanceSummary);

module.exports = router;
