const FeeStructure = require('../models/FeeStructure');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const logger = require('../utils/logger');
const { sendInvoiceAlert, sendPaymentAlert } = require('../services/sms.service');

// ─── Fee Structures ───────────────────────────────────────────────────────────

// GET /api/fees/structures
const listFeeStructures = async (req, res, next) => {
  try {
    const { classId, academicYearId, termName } = req.query;
    const filter = {};
    if (classId) filter.class = classId;
    if (academicYearId) filter.academicYear = academicYearId;
    if (termName) filter.termName = termName;

    const structures = await FeeStructure.find(filter)
      .populate('class', 'name')
      .populate('academicYear', 'name')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: structures });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/structures
const createFeeStructure = async (req, res, next) => {
  try {
    const { class: classId, academicYear, termName, items, notes } = req.body;

    const structure = await FeeStructure.create({
      class: classId,
      academicYear,
      termName,
      items,
      notes,
      totalAmount: 0, // will be computed by pre-save hook
      createdBy: req.user.id,
    });

    const populated = await FeeStructure.findById(structure._id)
      .populate('class', 'name')
      .populate('academicYear', 'name');

    logger.info(`Fee structure created for class ${classId}, term ${termName}`);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    // Duplicate key = already exists for this class/year/term
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A fee structure already exists for this class, academic year, and term',
      });
    }
    next(error);
  }
};

// GET /api/fees/structures/:id
const getFeeStructureById = async (req, res, next) => {
  try {
    const structure = await FeeStructure.findById(req.params.id)
      .populate('class', 'name')
      .populate('academicYear', 'name isCurrent')
      .populate('createdBy', 'email');

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }
    res.json({ success: true, data: structure });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/fees/structures/:id
const updateFeeStructure = async (req, res, next) => {
  try {
    const { items, notes, termName } = req.body;
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    if (items !== undefined) structure.items = items;
    if (notes !== undefined) structure.notes = notes;
    if (termName !== undefined) structure.termName = termName;

    await structure.save(); // pre-save hook recomputes totalAmount

    const populated = await FeeStructure.findById(structure._id)
      .populate('class', 'name')
      .populate('academicYear', 'name');

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/fees/structures/:id
const deleteFeeStructure = async (req, res, next) => {
  try {
    // Prevent deletion if invoices reference it
    const invoiceCount = await Invoice.countDocuments({ feeStructure: req.params.id });
    if (invoiceCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${invoiceCount} invoice(s) reference this fee structure`,
      });
    }

    const structure = await FeeStructure.findByIdAndDelete(req.params.id);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }
    res.json({ success: true, message: 'Fee structure deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

// POST /api/fees/invoices/generate
// Bulk-generate one invoice per active student in the class
const generateInvoices = async (req, res, next) => {
  try {
    const { classId, feeStructureId, dueDate, notes } = req.body;

    const structure = await FeeStructure.findById(feeStructureId);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    // Fetch all active students in this class
    const students = await Student.find({ currentClass: classId, status: 'active' }).select('_id');
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No active students found in this class' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const student of students) {
      try {
        const existing = await Invoice.findOne({
          student: student._id,
          feeStructure: feeStructureId,
        });
        if (existing) {
          results.skipped++;
          continue;
        }

        const fullStudent = await Student.findById(student._id).populate('guardians');
        if (!fullStudent) {
          results.errors.push({ studentId: student._id, error: 'Student not found' });
          continue;
        }

        let amountDue = structure.totalAmount;
        let invoiceNotes = notes || '';

        if (fullStudent.transport && !fullStudent.transport.usesBus) {
          const transportItem = structure.items.find(
            (item) =>
              item.name.toLowerCase() === 'transport' ||
              item.name.toLowerCase() === 'transportation'
          );
          if (transportItem) {
            amountDue = Math.max(0, amountDue - transportItem.amount);
            invoiceNotes = `${invoiceNotes ? invoiceNotes + ' | ' : ''}Excluded Transport fee (Not using bus)`.trim();
          }
        }

        const invoiceObj = await Invoice.create({
          student: student._id,
          feeStructure: feeStructureId,
          academicYear: structure.academicYear,
          termName: structure.termName,
          amountDue,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes: invoiceNotes,
          createdBy: req.user.id,
        });
        results.created++;

        // Send invoice alert to guardians
        try {
          if (fullStudent.guardians && fullStudent.guardians.length > 0) {
            for (const guardian of fullStudent.guardians) {
              if (guardian.phone) {
                await sendInvoiceAlert(fullStudent, guardian, invoiceObj);
              }
            }
          }
        } catch (smsErr) {
          logger.error(`[Invoice SMS Error] ${smsErr.message}`);
        }
      } catch (err) {
        results.errors.push({ studentId: student._id, error: err.message });
      }
    }

    logger.info(
      `Invoice generation: class=${classId} term=${structure.termName} created=${results.created} skipped=${results.skipped}`
    );

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.created} invoices created, ${results.skipped} already existed`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/invoices
const listInvoices = async (req, res, next) => {
  try {
    const {
      studentId,
      classId,
      status,
      termName,
      academicYearId,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (studentId) filter.student = studentId;
    if (status) filter.status = status;
    if (termName) filter.termName = termName;
    if (academicYearId) filter.academicYear = academicYearId;

    // If filtering by class, find all students in that class first
    if (classId) {
      const studentIds = await Student.find({ currentClass: classId }).distinct('_id');
      filter.student = { $in: studentIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('student', 'firstName lastName admissionNumber currentClass')
        .populate({ path: 'student', populate: { path: 'currentClass', select: 'name' } })
        .populate('feeStructure', 'termName totalAmount')
        .populate('academicYear', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: invoices,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/invoices/:id
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('feeStructure')
      .populate('academicYear', 'name')
      .populate('createdBy', 'email');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Fetch associated payments
    const payments = await Payment.find({ invoice: invoice._id }).sort({ paidAt: -1 });

    res.json({ success: true, data: { ...invoice.toJSON(), payments } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/fees/invoices/:id/void
const voidInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.amountPaid > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot void an invoice that has payments recorded',
      });
    }

    invoice.status = 'unpaid';
    invoice.notes = `VOIDED: ${req.body.reason || 'No reason given'}. ${invoice.notes || ''}`.trim();
    await invoice.save();

    logger.info(`Invoice ${invoice.invoiceNumber} voided by ${req.user.email}`);
    res.json({ success: true, data: invoice, message: 'Invoice voided' });
  } catch (error) {
    next(error);
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

// POST /api/fees/payments
const recordManualPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, method, transactionRef, paidAt, notes } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.balance <= 0) {
      return res.status(409).json({ success: false, message: 'Invoice is already fully paid' });
    }
    if (amount > invoice.balance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) exceeds outstanding balance (${invoice.balance})`,
      });
    }

    const payment = await Payment.create({
      invoice: invoice._id,
      student: invoice.student,
      amount,
      method,
      provider: 'manual',
      transactionRef,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      status: 'successful',
      notes,
      recordedBy: req.user.id,
    });

    // Update invoice
    invoice.amountPaid += amount;
    invoice.recalculate();
    await invoice.save();

    logger.info(
      `Manual payment recorded: ${payment.receiptNumber} amount=${amount} invoice=${invoice.invoiceNumber}`
    );

    const populated = await Payment.findById(payment._id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('invoice', 'invoiceNumber amountDue amountPaid balance status')
      .populate('recordedBy', 'email');

    // Send payment receipt SMS to guardians
    try {
      const fullStudent = await Student.findById(invoice.student).populate('guardians');
      if (fullStudent && fullStudent.guardians && fullStudent.guardians.length > 0) {
        for (const guardian of fullStudent.guardians) {
          if (guardian.phone) {
            // Ensure invoice balance is available
            payment.invoice = invoice;
            await sendPaymentAlert(fullStudent, guardian, payment);
          }
        }
      }
    } catch (smsErr) {
      logger.error(`[Payment SMS Error] ${smsErr.message}`);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/payments
const listPayments = async (req, res, next) => {
  try {
    const { invoiceId, studentId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (invoiceId) filter.invoice = invoiceId;
    if (studentId) filter.student = studentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('student', 'firstName lastName admissionNumber')
        .populate('invoice', 'invoiceNumber termName amountDue balance status')
        .populate('recordedBy', 'email')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payments,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('invoice', 'invoiceNumber termName amountDue amountPaid balance status')
      .populate('recordedBy', 'email');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Fee Structures
  listFeeStructures,
  createFeeStructure,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
  // Invoices
  generateInvoices,
  listInvoices,
  getInvoiceById,
  voidInvoice,
  // Payments
  recordManualPayment,
  listPayments,
  getPaymentById,
};
