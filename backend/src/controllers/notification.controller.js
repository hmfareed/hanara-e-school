const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const logger = require('../utils/logger');

// VAPID Keys Setup (loaded strictly from environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@hanaraschools.edu.gh';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    logger.warn('WebPush VAPID configuration notice: ' + e.message);
  }
} else {
  logger.warn('WebPush VAPID keys are not configured in environment variables.');
}

// GET /api/notifications/vapid-public-key
const getVapidPublicKey = async (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({
      success: false,
      message: 'VAPID public key not configured on server.',
    });
  }

  res.json({
    success: true,
    data: {
      publicKey: VAPID_PUBLIC_KEY,
    },
  });
};

// POST /api/notifications/subscribe
const subscribeUser = async (req, res, next) => {
  try {
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Valid push subscription object with endpoint and keys is required.',
      });
    }

    const userId = req.user.id || req.user._id;
    const role = req.user.role;

    // Upsert subscription
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: userId,
        role,
        keys,
        userAgent: userAgent || req.headers['user-agent'] || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(`User ${req.user.email} (${role}) subscribed to Web Push notifications.`);

    res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/unsubscribe
const unsubscribeUser = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint });
    } else {
      await PushSubscription.deleteMany({ user: req.user.id || req.user._id });
    }

    res.json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/send-broadcast
const sendBroadcastNotification = async (req, res, next) => {
  try {
    const { title, body, icon, url, targetRole, targetUserId } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required for push notification.',
      });
    }

    const filter = {};
    if (targetRole && targetRole !== 'all') {
      filter.role = targetRole;
    }
    if (targetUserId) {
      filter.user = targetUserId;
    }

    const subscriptions = await PushSubscription.find(filter);

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: url || '/',
      timestamp: Date.now(),
    });

    let successCount = 0;
    let failureCount = 0;

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
        successCount++;
      } catch (err) {
        failureCount++;
        // If expired or invalid (410 Gone / 404 Not Found), clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    });

    await Promise.all(sendPromises);

    logger.info(
      `Broadcast push "${title}" sent to ${subscriptions.length} devices (Success: ${successCount}, Failed: ${failureCount})`
    );

    res.json({
      success: true,
      message: `Push notification dispatched. Sent to ${successCount} devices.`,
      data: {
        totalTargeted: subscriptions.length,
        successCount,
        failureCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notifications/status
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const count = await PushSubscription.countDocuments({ user: userId });
    res.json({
      success: true,
      data: {
        isSubscribed: count > 0,
        deviceCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVapidPublicKey,
  subscribeUser,
  unsubscribeUser,
  sendBroadcastNotification,
  getSubscriptionStatus,
};
