/**
 * sync.routes.js
 *
 * GET  /api/sync/pull   — Pull updated documents since a timestamp
 * POST /api/sync/push   — Accept a batch of mutations (future use)
 *
 * Both endpoints require authentication.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const syncController = require('../controllers/sync.controller');

const mongoose = require('mongoose');

// Fast lightweight connectivity ping endpoint (verifies backend reachability and database status)
router.get('/ping', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  return res.json({
    success: true,
    isOnline: true,
    dbConnected: isDbConnected,
    timestamp: Date.now(),
  });
});

// All subsequent sync routes require a valid JWT
router.use(protect);

// Consolidated offline bootstrap bundle for initial client cache hydration
router.get('/bootstrap', syncController.bootstrap);

// Pull delta documents from any store since a given timestamp
router.get('/pull', syncController.pull);

// Accept a batch push of mutations (server-side fan-out)
router.post('/push', syncController.push);

module.exports = router;
