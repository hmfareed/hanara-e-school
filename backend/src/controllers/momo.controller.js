const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const { initiateCheckout, verifyWebhook, extractPaymentDetails } = require('../services/momo.service');
const { sendPaymentAlert } = require('../services/sms.service');
const logger = require('../utils/logger');

// POST /api/fees/payments/momo/initiate
const initiateMomoPayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.balance <= 0) {
      return res.status(409).json({ success: false, message: 'Invoice is already fully paid' });
    }

    const student = await Student.findById(invoice.student);
    let guardian = null;
    if (student.guardians && student.guardians.length > 0) {
      guardian = await Guardian.findById(student.guardians[0]);
    }

    // Call momo service to get checkout URL
    const checkoutResult = await initiateCheckout({ invoice, student, guardian });

    // Create a pending Payment record
    await Payment.create({
      invoice: invoice._id,
      student: invoice.student,
      amount: checkoutResult.amount,
      method: 'momo',
      provider: checkoutResult.provider,
      transactionRef: checkoutResult.reference,
      status: 'pending',
      notes: `Initiated via Mobile Money ${checkoutResult.provider} portal`,
      recordedBy: req.user.id,
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: checkoutResult.checkoutUrl,
        reference: checkoutResult.reference,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/payments/momo/verify
const verifyMomoTransaction = async (req, res, next) => {
  try {
    const { ref } = req.query;
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    }

    const payment = await Payment.findOne({ transactionRef: ref })
      .populate('student', 'firstName lastName admissionNumber')
      .populate('invoice', 'invoiceNumber amountDue balance status');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
        invoiceNumber: payment.invoice?.invoiceNumber,
        studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/payments/momo/webhook
const momoWebhook = async (req, res, next) => {
  try {
    // 1. Verify gateway webhook signature
    const verification = verifyWebhook(req);
    if (!verification.valid) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // 2. Extract normalized details
    const details = extractPaymentDetails(verification.data);
    logger.info(`[MoMo Webhook] Received payment status callback. Ref: ${details.transactionRef}, Amount: ${details.amount}`);

    // Sandbox check event in payload: sandbox webhook confirms success
    // In Paystack, we check verification.event === 'charge.success'
    const isSuccess = req.body.event === 'charge.success' || process.env.MOMO_PROVIDER !== 'paystack';

    // 3. Find and update Payment
    let payment = await Payment.findOne({ transactionRef: details.transactionRef });

    if (!payment) {
      // Create if it didn't exist for some reason
      const invoice = await Invoice.findById(details.invoiceId);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found for webhook reference' });
      }
      payment = await Payment.create({
        invoice: invoice._id,
        student: invoice.student,
        amount: details.amount,
        method: 'momo',
        provider: details.provider,
        transactionRef: details.transactionRef,
        status: isSuccess ? 'successful' : 'failed',
        notes: 'Recorded via gateway webhook (auto-created)',
      });
    }

    if (payment.status === 'pending') {
      payment.status = isSuccess ? 'successful' : 'failed';
      payment.gatewayPayload = req.body;
      await payment.save();

      if (payment.status === 'successful') {
        // Update associated invoice
        const invoice = await Invoice.findById(payment.invoice);
        if (invoice) {
          invoice.amountPaid += payment.amount;
          invoice.recalculate();
          await invoice.save();

          // Dispatch SMS Alert confirmation to guardian
          try {
            const student = await Student.findById(invoice.student);
            if (student && student.guardians && student.guardians.length > 0) {
              const guardian = await Guardian.findById(student.guardians[0]);
              if (guardian && guardian.phone) {
                // Populate invoice on payment record for SMS details
                payment.invoice = invoice;
                await sendPaymentAlert(student, guardian, payment);
              }
            }
          } catch (smsErr) {
            logger.error(`[MoMo Webhook SMS Error] Failed to send payment confirmation SMS: ${smsErr.message}`);
          }
        }
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`[MoMo Webhook Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  initiateMomoPayment,
  verifyMomoTransaction,
  momoWebhook,
};
