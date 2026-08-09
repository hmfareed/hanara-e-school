const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getRecipients,
  sendMessage,
  getInbox,
  getSent,
  markAsRead,
} = require('../controllers/teacherMessage.controller');

router.get('/recipients', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getRecipients);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), sendMessage);
router.get('/inbox', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getInbox);
router.get('/sent', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getSent);
router.put('/:id/read', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), markAsRead);

module.exports = router;
