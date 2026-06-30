const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  generateInvoicesSchema,
  recordManualPaymentSchema,
} = require('../validators/fee.validator');
const {
  listFeeStructures,
  createFeeStructure,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
  generateInvoices,
  listInvoices,
  getInvoiceById,
  voidInvoice,
  recordManualPayment,
  listPayments,
  getPaymentById,
} = require('../controllers/fee.controller');

// All fee routes require authentication
// Accountants and admins have full access; teachers are excluded
const feeAccess = ['superadmin', 'admin', 'accountant'];

// ─── Fee Structures ───────────────────────────────────────────────────────────
router.get('/structures', protect, authorize(...feeAccess), listFeeStructures);
router.post('/structures', protect, authorize(...feeAccess), validate(createFeeStructureSchema), createFeeStructure);
router.get('/structures/:id', protect, authorize(...feeAccess), getFeeStructureById);
router.patch('/structures/:id', protect, authorize(...feeAccess), validate(updateFeeStructureSchema), updateFeeStructure);
router.delete('/structures/:id', protect, authorize('superadmin', 'admin'), deleteFeeStructure);

// ─── Invoices ─────────────────────────────────────────────────────────────────
router.post('/invoices/generate', protect, authorize(...feeAccess), validate(generateInvoicesSchema), generateInvoices);
router.get('/invoices', protect, authorize(...feeAccess), listInvoices);
router.get('/invoices/:id', protect, authorize(...feeAccess), getInvoiceById);
router.patch('/invoices/:id/void', protect, authorize('superadmin', 'admin'), voidInvoice);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post('/payments', protect, authorize(...feeAccess), validate(recordManualPaymentSchema), recordManualPayment);
router.get('/payments', protect, authorize(...feeAccess), listPayments);
router.get('/payments/:id', protect, authorize(...feeAccess), getPaymentById);

module.exports = router;
