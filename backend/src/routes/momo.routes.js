const express = require('express');
const router = express.Router();
const { initiateMomoPayment, verifyMomoTransaction, momoWebhook } = require('../controllers/momo.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Initiate MoMo checkout
router.post('/initiate', protect, authorize('superadmin', 'admin', 'accountant', 'parent'), initiateMomoPayment);

// Verify transaction status (frontend callback query)
router.get('/verify', protect, authorize('superadmin', 'admin', 'accountant', 'parent'), verifyMomoTransaction);

// Webhook endpoint (public gateway callback)
router.post('/webhook', momoWebhook);

module.exports = router;
