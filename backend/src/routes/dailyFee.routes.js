const express = require('express');
const router = express.Router();
const {
  getDailyRegister,
  submitDailyRegister,
  getDailyFeeSummary,
} = require('../controllers/dailyFee.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { submitDailyRegisterSchema } = require('../validators/transport.validators');

router.get('/', protect, authorize('superadmin', 'admin', 'teacher'), getDailyRegister);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), validate(submitDailyRegisterSchema), submitDailyRegister);
router.get('/summary', protect, authorize('superadmin', 'admin', 'accountant'), getDailyFeeSummary);

module.exports = router;
