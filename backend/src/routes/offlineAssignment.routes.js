const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignmentScores,
  deleteAssignment,
} = require('../controllers/offlineAssignment.controller');

router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createAssignment);
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getAssignments);
router.get('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getAssignmentById);
router.put('/:id/scores', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), updateAssignmentScores);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteAssignment);

module.exports = router;
