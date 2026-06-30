const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createAssignment,
  deactivateAssignment,
  listAssignments,
} = require('../controllers/assignment.controller');

// Only admins/superadmins can manage subject assignments
router.post('/', protect, authorize('superadmin', 'admin'), createAssignment);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deactivateAssignment);
router.get('/', protect, authorize('superadmin', 'admin'), listAssignments);

module.exports = router;
