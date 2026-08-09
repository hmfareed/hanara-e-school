const { z } = require('zod');

const createDailyFeeStructureSchema = z.object({
  class: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  feedingFeeAmount: z.number().nonnegative('Feeding fee must be non-negative'),
  busFareAmount: z.number().nonnegative('Bus fare must be non-negative'),
  effectiveStartDate: z.string().datetime({ offset: true }).optional(),
});

const submissionLineItemSchema = z.object({
  student: z.string().min(1, 'Student ID is required'),
  feedingStatus: z.enum(['paid', 'unpaid', 'absent']),
  feedingAmount: z.number().nonnegative(),
  busStatus: z.enum(['paid', 'unpaid', 'absent']),
  busAmount: z.number().nonnegative(),
});

const submitDailyRegisterSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  date: z.string().datetime({ offset: true, message: 'Valid date is required (ISO 8601)' }),
  lineItems: z.array(submissionLineItemSchema).min(1, 'At least one student record is required'),
});

const createCorrectionSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  feedingStatus: z.enum(['paid', 'unpaid', 'absent']),
  feedingAmount: z.number().nonnegative(),
  busStatus: z.enum(['paid', 'unpaid', 'absent']),
  busAmount: z.number().nonnegative(),
  reason: z.string().min(5, 'Correction reason must be at least 5 characters'),
});

const confirmSubmissionSchema = z.object({
  actuallyCountedAmount: z.number().nonnegative('Actually counted amount must be non-negative'),
  action: z.enum(['confirm', 'flag']),
  discrepancyNotes: z.string().optional().default(''),
});

module.exports = {
  createDailyFeeStructureSchema,
  submitDailyRegisterSchema,
  createCorrectionSchema,
  confirmSubmissionSchema,
};
