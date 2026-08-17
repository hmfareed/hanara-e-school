const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const PushSubscription = require('../src/models/PushSubscription');

describe('Web Push Notification Engine', () => {
  let adminToken, parentToken;
  let adminUser, parentUser;

  beforeAll(async () => {
    await User.deleteMany({});
    await PushSubscription.deleteMany({});

    adminUser = await User.create({
      email: 'admin.push@hanaraschools.edu.gh',
      passwordHash: 'Password123!',
      role: 'admin',
      isActive: true,
      approvalStatus: 'approved',
    });

    parentUser = await User.create({
      email: 'parent.push@hanaraschools.edu.gh',
      phone: '0244111222',
      passwordHash: 'Password123!',
      role: 'parent',
      isActive: true,
      approvalStatus: 'approved',
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin.push@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    const parentLogin = await request(app).post('/api/auth/login').send({
      email: 'parent.push@hanaraschools.edu.gh',
      password: 'Password123!',
    });
    parentToken = parentLogin.body.data.accessToken;
  });

  describe('GET /api/notifications/vapid-public-key', () => {
    it('should return valid public VAPID key', async () => {
      const res = await request(app).get('/api/notifications/vapid-public-key');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicKey).toBeDefined();
      expect(typeof res.body.data.publicKey).toBe('string');
    });
  });

  describe('POST /api/notifications/subscribe', () => {
    it('should successfully subscribe a user device for push notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-parent-1',
          keys: {
            p256dh: 'BNcRdreAxxxxxxxxxxxxxxxxxxxx',
            auth: 'tBHx0xxxxxxxxxx',
          },
          userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('parent');

      const count = await PushSubscription.countDocuments({ user: parentUser._id });
      expect(count).toBe(1);
    });

    it('should handle duplicate subscriptions gracefully via upsert', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-parent-1',
          keys: {
            p256dh: 'BNcRdreAxxxxxxxxxxxxxxxxxxxx',
            auth: 'tBHx0xxxxxxxxxx',
          },
          userAgent: 'Mozilla/5.0 (Linux; Android 14 Updated)',
        });

      expect(res.status).toBe(201);
      const count = await PushSubscription.countDocuments({ user: parentUser._id });
      expect(count).toBe(1);
    });
  });

  describe('GET /api/notifications/status', () => {
    it('should return subscription status for current user', async () => {
      const res = await request(app)
        .get('/api/notifications/status')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSubscribed).toBe(true);
      expect(res.body.data.deviceCount).toBe(1);
    });
  });

  describe('POST /api/notifications/send-broadcast', () => {
    it('should allow admin to trigger broadcast push notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/send-broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'School Re-opening Announcement',
          body: 'Academic term begins on Monday 1st September 2026. Please ensure all student materials are ready.',
          targetRole: 'parent',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTargeted).toBe(1);
    });

    it('should deny non-admin from sending broadcast push notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/send-broadcast')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          title: 'Unauthorized Message',
          body: 'Should fail',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/notifications/unsubscribe', () => {
    it('should successfully unsubscribe device', async () => {
      const res = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-parent-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const count = await PushSubscription.countDocuments({ user: parentUser._id });
      expect(count).toBe(0);
    });
  });
});
