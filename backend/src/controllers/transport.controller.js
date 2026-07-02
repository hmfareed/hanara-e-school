const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Student = require('../models/Student');
const logger = require('../utils/logger');

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /api/transport/routes
const listRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find().sort({ name: 1 });
    res.json({ success: true, data: routes });
  } catch (error) {
    next(error);
  }
};

// POST /api/transport/routes
const createRoute = async (req, res, next) => {
  try {
    const { name, pickupTime, dropoffTime, stops } = req.body;

    const existing = await Route.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Route name already exists' });
    }

    const route = await Route.create({ name, pickupTime, dropoffTime, stops });
    logger.info(`Route created: ${route.name}`);
    res.status(201).json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// GET /api/transport/routes/:id
const getRouteById = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/transport/routes/:id
const updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    logger.info(`Route updated: ${route.name}`);
    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/transport/routes/:id
const deleteRoute = async (req, res, next) => {
  try {
    // Check if any Bus is assigned to this route
    const assignedBus = await Bus.findOne({ route: req.params.id });
    if (assignedBus) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete route: it is assigned to Bus ${assignedBus.plateNumber}`,
      });
    }

    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    logger.info(`Route deleted: ${route.name}`);
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── BUSES ───────────────────────────────────────────────────────────────────

// GET /api/transport/buses
const listBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find()
      .populate('driver', 'firstName lastName phone photoUrl')
      .populate('route')
      .sort({ plateNumber: 1 });

    // Include the active student count for each bus
    const busesWithCount = await Promise.all(
      buses.map(async (bus) => {
        const studentCount = await Student.countDocuments({
          'transport.bus': bus._id,
          status: 'active',
        });
        return {
          ...bus.toJSON(),
          studentCount,
        };
      })
    );

    res.json({ success: true, data: busesWithCount });
  } catch (error) {
    next(error);
  }
};

// POST /api/transport/buses
const createBus = async (req, res, next) => {
  try {
    const { plateNumber, capacity, driver, route } = req.body;

    const existing = await Bus.findOne({ plateNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bus plate number already exists' });
    }

    const bus = await Bus.create({ plateNumber, capacity, driver, route });

    const populated = await Bus.findById(bus._id)
      .populate('driver', 'firstName lastName phone')
      .populate('route');

    logger.info(`Bus created: ${bus.plateNumber}`);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/transport/buses/:id
const getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driver', 'firstName lastName phone photoUrl')
      .populate('route');
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    res.json({ success: true, data: bus });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/transport/buses/:id
const updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('driver', 'firstName lastName phone')
      .populate('route');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    logger.info(`Bus updated: ${bus.plateNumber}`);
    res.json({ success: true, data: bus });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/transport/buses/:id
const deleteBus = async (req, res, next) => {
  try {
    // Check if any active student is assigned to this bus
    const assignedStudent = await Student.findOne({ 'transport.bus': req.params.id, status: 'active' });
    if (assignedStudent) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete bus: students are currently assigned to it',
      });
    }

    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    logger.info(`Bus deleted: ${bus.plateNumber}`);
    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/transport/buses/:id/manifest
const getBusManifest = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driver', 'firstName lastName phone')
      .populate('route');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    const students = await Student.find({
      'transport.bus': bus._id,
      status: 'active',
    })
      .populate('currentClass', 'name')
      .populate('guardians', 'firstName lastName phone relationship')
      .sort({ lastName: 1, firstName: 1 });

    // Sort students by route stop order if available
    if (bus.route && bus.route.stops && bus.route.stops.length > 0) {
      const stopOrderMap = {};
      bus.route.stops.forEach((stop) => {
        stopOrderMap[stop.name.toLowerCase()] = stop.order;
      });

      students.sort((a, b) => {
        const orderA = stopOrderMap[(a.transport?.stop || '').toLowerCase()] ?? 999;
        const orderB = stopOrderMap[(b.transport?.stop || '').toLowerCase()] ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
    }

    res.json({
      success: true,
      data: {
        bus,
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Routes
  listRoutes,
  createRoute,
  getRouteById,
  updateRoute,
  deleteRoute,
  // Buses
  listBuses,
  createBus,
  getBusById,
  updateBus,
  deleteBus,
  getBusManifest,
};
