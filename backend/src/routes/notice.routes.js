const express = require('express');
const router = express.Router();
const { getNotices, createNotice, updateNotice, deleteNotice } = require('../controllers/notice.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getNotices);
router.post('/', authorize('superadmin', 'admin'), createNotice);
router.patch('/:id', authorize('superadmin', 'admin'), updateNotice);
router.delete('/:id', authorize('superadmin', 'admin'), deleteNotice);

module.exports = router;
