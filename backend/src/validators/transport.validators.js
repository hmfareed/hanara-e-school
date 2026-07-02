const { z } = require('zod');

const stopSchema = z.object({
  name: z.string().min(1, 'Stop name is required'),
  order: z.number().int().min(0, 'Order must be a non-negative integer'),
  approxPickupTime: z.string().optional().default(''),
});

const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  pickupTime: z.string().optional().default('07:00 AM'),
  dropoffTime: z.string().optional().default('03:00 PM'),
  stops: z.array(stopSchema).min(1, 'At least one stop is required'),
});

const updateRouteSchema = createRouteSchema.partial();

const createBusSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  driver: z.string().optional().nullable().default(null),
  route: z.string().optional().nullable().default(null),
});

const updateBusSchema = createBusSchema.partial();

const dailyRegisterRecordSchema = z.object({
  student: z.string().min(1, 'Student ID is required'),
  status: z.enum(['both', 'feeding', 'absent', 'unpaid']),
  amountPaid: z.number().min(0),
});

const submitDailyRegisterSchema = z.object({
  date: z.string().datetime({ message: 'Valid date is required (ISO 8601)' }),
  classId: z.string().min(1, 'Class ID is required'),
  records: z.array(dailyRegisterRecordSchema).min(1, 'At least one student record is required'),
});

module.exports = {
  createRouteSchema,
  updateRouteSchema,
  createBusSchema,
  updateBusSchema,
  submitDailyRegisterSchema,
};
