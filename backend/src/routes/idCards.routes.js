const express = require('express');
const router = express.Router();
const idCardsController = require('../controllers/idCards.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/batch', authorize('superadmin', 'admin', 'system_admin'), idCardsController.getBatchCardsPayload);
router.post('/scan', authorize('superadmin', 'admin', 'teacher', 'system_admin'), idCardsController.processGateScan);

module.exports = router;
