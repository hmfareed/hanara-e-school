const express = require('express');
const router = express.Router();
const { getExecutiveSummary } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('superadmin', 'admin', 'accountant'));

router.get('/executive-summary', getExecutiveSummary);

module.exports = router;
