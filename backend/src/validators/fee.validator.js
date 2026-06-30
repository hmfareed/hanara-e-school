const { z } = require('zod');

// ─── Fee Structure ────────────────────────────────────────────────────────────

const feeItemSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
});

const createFeeStructureSchema = z.object({
  class: z.string().min(1, 'Class ID is required'),
  academicYear: z.string().min(1, 'Academic year ID is required'),
  termName: z.enum(['Term 1', 'Term 2', 'Term 3']),
  items: z.array(feeItemSchema).min(1, 'At least one fee item is required'),
  notes: z.string().max(500).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
});

const updateFeeStructureSchema = z.object({
  termName: z.enum(['Term 1', 'Term 2', 'Term 3']).optional(),
  items: z.array(feeItemSchema).min(1).optional(),
  notes: z.string().max(500).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
});

// ─── Invoice ─────────────────────────────────────────────────────────────────

const generateInvoicesSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  feeStructureId: z.string().min(1, 'Fee structure ID is required'),
  dueDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500).optional(),
});

// ─── Payments ────────────────────────────────────────────────────────────────

const recordManualPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'bank']),
  transactionRef: z.string().max(100).optional(),
  paidAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500).optional(),
});

const initiateMomoSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  momoNumber: z.string().min(9).max(15).optional(),
  momoProvider: z.enum(['mtn', 'telecel', 'airteltigo']).optional(),
});

module.exports = {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  generateInvoicesSchema,
  recordManualPaymentSchema,
  initiateMomoSchema,
};
