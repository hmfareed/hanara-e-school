const { z } = require('zod');

const createStaffSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  otherNames: z.string().optional().default(''),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().datetime().optional().nullable(),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().nullable(),
  address: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  employmentDate: z.string().datetime().optional().nullable(),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated', 'retired']).default('active'),
  role: z.enum(['teacher', 'accountant', 'admin', 'driver', 'support']),
  classesAssigned: z.array(z.string()).optional().default([]),
  // Create a user login account for this staff member
  createUserAccount: z.boolean().optional().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const updateStaffSchema = createStaffSchema.partial();

const assignClassSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  classIds: z.array(z.string()).min(1, 'At least one class is required'),
});

module.exports = { createStaffSchema, updateStaffSchema, assignClassSchema };
