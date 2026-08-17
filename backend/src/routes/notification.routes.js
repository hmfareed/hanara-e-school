const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getVapidPublicKey,
  subscribeUser,
  unsubscribeUser,
  sendBroadcastNotification,
  getSubscriptionStatus,
} = require('../controllers/notification.controller');

// Public/Auth VAPID key
router.get('/vapid-public-key', getVapidPublicKey);

// User push subscriptions
router.get('/status', protect, getSubscriptionStatus);
router.post('/subscribe', protect, subscribeUser);
router.post('/unsubscribe', protect, unsubscribeUser);

// Admin broadcast push dispatcher
router.post('/send-broadcast', protect, authorize('superadmin', 'admin', 'system_admin'), sendBroadcastNotification);

module.exports = router;
