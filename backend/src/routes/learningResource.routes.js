const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createResource,
  getResources,
  deleteResource,
} = require('../controllers/learningResource.controller');

router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createResource);
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getResources);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteResource);

module.exports = router;
