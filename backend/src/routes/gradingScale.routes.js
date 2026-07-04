const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getGradingScales,
  updateGradingScale,
} = require('../controllers/gradingScale.controller');

// GET /api/grading-scales - get all configurations
router.get('/', protect, authorize('superadmin', 'admin', 'teacher'), getGradingScales);

// PATCH /api/grading-scales/:levelCategory - update a specific level category's grading scale (superadmin only)
router.patch('/:levelCategory', protect, authorize('superadmin'), updateGradingScale);

module.exports = router;
