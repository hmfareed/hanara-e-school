const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createBehaviourRecord,
  getBehaviourRecords,
  deleteBehaviourRecord,
} = require('../controllers/behaviour.controller');

router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createBehaviourRecord);
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getBehaviourRecords);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteBehaviourRecord);

module.exports = router;
