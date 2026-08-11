const express = require('express');
const router = express.Router();
const idCardsController = require('../controllers/idCards.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Unauthenticated public route for mobile phone QR code scans
router.get('/verify-public/:token', idCardsController.verifyPublicCardToken);

router.use(protect);

router.get('/batch', authorize('superadmin', 'admin', 'system_admin'), idCardsController.getBatchCardsPayload);
router.post('/scan', authorize('superadmin', 'admin', 'teacher', 'system_admin'), idCardsController.processGateScan);
router.get('/stats', authorize('superadmin', 'admin', 'teacher', 'system_admin'), idCardsController.getGateStats);
router.get('/sample-tokens', authorize('superadmin', 'admin', 'teacher', 'system_admin'), idCardsController.getSampleTokens);

module.exports = router;
