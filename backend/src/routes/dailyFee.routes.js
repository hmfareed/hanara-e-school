const express = require('express');
const router = express.Router();
const {
  getDailyRegister,
  submitDailyRegister,
  getDailyFeeSummary,
} = require('../controllers/dailyFee.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { requireFormTeacherForClass } = require('../middleware/assignmentAuth');
const { validate } = require('../middleware/validate');
const { submitDailyRegisterSchema } = require('../validators/transport.validators');

// Only form teachers / class teachers can access and submit the daily fee register
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacherForClass, getDailyRegister);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacherForClass, validate(submitDailyRegisterSchema), submitDailyRegister);
router.get('/summary', protect, authorize('superadmin', 'admin', 'accountant'), getDailyFeeSummary);

module.exports = router;
