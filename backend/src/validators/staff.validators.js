const { z } = require('zod');

const createStaffSchema = z.object({
  title: z.string().optional().default(''),
  photoUrl: z.string().optional().nullable(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  otherNames: z.string().optional().default(''),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.union([z.string(), z.date(), z.null()]).optional(),
  phone: z.string().min(8, 'Valid phone number required'),
  email: z.union([z.string().email('Invalid email'), z.literal(''), z.null()]).optional(),
  address: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  employmentDate: z.union([z.string(), z.date(), z.null()]).optional(),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated', 'retired']).default('active'),
  role: z.enum(['teacher', 'accountant', 'admin', 'driver', 'support', 'cleaner']),
  baseSalary: z.coerce.number().optional().default(0),
  classesAssigned: z.array(z.union([z.string(), z.object({ _id: z.string() }).passthrough()])).optional().default([]),
  colorSection: z.enum(['Red', 'Yellow', 'Green', 'Blue']).or(z.literal('')).optional().nullable().default(null),
  sectionRole: z.enum(['House Master', 'House Mistress', 'Patron', 'Assistant', 'Member']).or(z.literal('')).optional().nullable().default('Patron'),
  // Create a user login account for this staff member
  createUserAccount: z.boolean().optional().default(true),
  password: z.string().optional().nullable(),
});

const updateStaffSchema = createStaffSchema.partial();

const assignClassSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  classIds: z.array(z.string()).min(1, 'At least one class is required'),
});

module.exports = { createStaffSchema, updateStaffSchema, assignClassSchema };
