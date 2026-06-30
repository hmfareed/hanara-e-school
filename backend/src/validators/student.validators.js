const { z } = require('zod');

const guardianSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.enum(['father', 'mother', 'guardian', 'sibling', 'grandparent', 'uncle', 'aunt', 'other']),
  phone: z.string().min(10, 'Valid phone number required'),
  altPhone: z.string().optional().default(''),
  email: z.string().email().optional().default(''),
  occupation: z.string().optional().default(''),
  address: z.string().optional().default(''),
  momoNumber: z.string().optional().nullable().default(null),
  momoProvider: z.enum(['mtn', 'telecel', 'airteltigo']).optional().nullable().default(null),
  consentDataProcessing: z.object({
    granted: z.boolean(),
    grantedAt: z.string().datetime().optional().nullable(),
  }).optional().default({ granted: false, grantedAt: null }),
});

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  otherNames: z.string().optional().default(''),
  gender: z.enum(['male', 'female']),
  dob: z.string().datetime({ message: 'Valid date of birth required (ISO 8601)' }),
  currentClass: z.string().optional().nullable().default(null),
  enrollmentDate: z.string().datetime().optional(),
  medicalNotes: z.string().optional().default(''),
  transport: z.object({
    usesBus: z.boolean().default(false),
    stop: z.string().optional().default(''),
  }).optional().default({ usesBus: false, stop: '' }),
  guardian: guardianSchema.optional(),
});

const updateStudentSchema = createStudentSchema.partial();

const withdrawStudentSchema = z.object({
  reason: z.string().min(1, 'Withdrawal reason is required'),
  effectiveDate: z.string().datetime().optional(),
});

module.exports = { createStudentSchema, updateStudentSchema, withdrawStudentSchema, guardianSchema };
