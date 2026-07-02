const express = require('express');
const router = express.Router();
const {
  listRoutes,
  createRoute,
  getRouteById,
  updateRoute,
  deleteRoute,
  listBuses,
  createBus,
  getBusById,
  updateBus,
  deleteBus,
  getBusManifest,
} = require('../controllers/transport.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createRouteSchema,
  updateRouteSchema,
  createBusSchema,
  updateBusSchema,
} = require('../validators/transport.validators');

// Route management
router.get('/routes', protect, authorize('superadmin', 'admin', 'driver'), listRoutes);
router.post('/routes', protect, authorize('superadmin', 'admin'), validate(createRouteSchema), createRoute);
router.get('/routes/:id', protect, authorize('superadmin', 'admin', 'driver'), getRouteById);
router.patch('/routes/:id', protect, authorize('superadmin', 'admin'), validate(updateRouteSchema), updateRoute);
router.delete('/routes/:id', protect, authorize('superadmin', 'admin'), deleteRoute);

// Bus management
router.get('/buses', protect, authorize('superadmin', 'admin', 'driver'), listBuses);
router.post('/buses', protect, authorize('superadmin', 'admin'), validate(createBusSchema), createBus);
router.get('/buses/:id', protect, authorize('superadmin', 'admin', 'driver'), getBusById);
router.patch('/buses/:id', protect, authorize('superadmin', 'admin'), validate(updateBusSchema), updateBus);
router.delete('/buses/:id', protect, authorize('superadmin', 'admin'), deleteBus);

// Manifest management
router.get('/buses/:id/manifest', protect, authorize('superadmin', 'admin', 'driver'), getBusManifest);

module.exports = router;
