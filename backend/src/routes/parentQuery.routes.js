const express = require('express');
const router = express.Router();
const { createParentQuery, getQueriesForUser, replyToParentQuery } = require('../controllers/parentQuery.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getQueriesForUser);
router.post('/', authorize('parent'), createParentQuery);
router.post('/:id/reply', replyToParentQuery);

module.exports = router;
