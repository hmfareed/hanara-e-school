/**
 * momo.service.js
 *
 * Gateway abstraction for Mobile Money payments.
 * Modes:
 *   - sandbox (default):  auto-confirms after 3 seconds — no real credentials needed
 *   - paystack:           calls Paystack Ghana Initialize Transaction API
 *
 * Set MOMO_PROVIDER=paystack and PAYSTACK_SECRET_KEY=sk_... in .env to go live.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const PROVIDER = process.env.MOMO_PROVIDER || 'sandbox';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── Sandbox Mode ────────────────────────────────────────────────────────────

async function sandboxInitiate({ invoice, student }) {
  const ref = `SANDBOX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const checkoutUrl = `${CLIENT_ORIGIN}/finance/momo/sandbox?ref=${ref}&invoiceId=${invoice._id}`;

  logger.info(`[MoMo Sandbox] Initiated checkout for invoice ${invoice.invoiceNumber}. Ref: ${ref}`);

  return {
    provider: 'sandbox',
    reference: ref,
    checkoutUrl,
    amount: invoice.balance,
  };
}

// ─── Paystack Mode ───────────────────────────────────────────────────────────

async function paystackInitiate({ invoice, student, guardian }) {
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  const ref = `HNRA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const amountKobo = Math.round(invoice.balance * 100); // Paystack uses kobo (pesewas)

  const payload = {
    email: guardian?.email || `${student.admissionNumber}@hanaraschools.edu.gh`,
    amount: amountKobo,
    currency: 'GHS',
    reference: ref,
    callback_url: `${CLIENT_ORIGIN}/finance/momo/verify?ref=${ref}`,
    metadata: {
      invoiceId: invoice._id.toString(),
      studentName: `${student.firstName} ${student.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
    },
    channels: ['mobile_money'],
  };

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.status) {
    throw new Error(`Paystack error: ${data.message}`);
  }

  logger.info(`[MoMo Paystack] Initiated checkout. Ref: ${ref}, URL: ${data.data.authorization_url}`);
  return {
    provider: 'paystack',
    reference: ref,
    checkoutUrl: data.data.authorization_url,
    amount: invoice.balance,
  };
}

/**
 * initiateCheckout — call this from the payment controller
 */
async function initiateCheckout({ invoice, student, guardian }) {
  if (PROVIDER === 'paystack') {
    return paystackInitiate({ invoice, student, guardian });
  }
  return sandboxInitiate({ invoice, student });
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

/**
 * verifyWebhook(req)
 * Returns { valid: Boolean, event, data }
 * For sandbox, always returns valid = true.
 * For Paystack, verifies the X-Paystack-Signature header.
 */
function verifyWebhook(req) {
  if (PROVIDER === 'sandbox') {
    return { valid: true, event: req.body.event, data: req.body.data || req.body };
  }

  // Paystack HMAC-SHA512 verification
  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    logger.warn('[MoMo Paystack] Webhook signature mismatch — rejected');
    return { valid: false };
  }

  return {
    valid: true,
    event: req.body.event,          // e.g. "charge.success"
    data: req.body.data,            // transaction object from Paystack
  };
}

/**
 * extractPaymentDetails(webhookData)
 * Normalise provider-specific fields into our Payment model shape.
 */
function extractPaymentDetails(webhookData) {
  if (PROVIDER === 'paystack') {
    return {
      transactionRef: webhookData.reference,
      amount: webhookData.amount / 100,           // kobo → cedis
      provider: 'paystack',
      method: 'momo',
      invoiceId: webhookData.metadata?.invoiceId,
    };
  }
  // Sandbox
  return {
    transactionRef: webhookData.reference || webhookData.ref,
    amount: webhookData.amount,
    provider: 'sandbox',
    method: 'momo',
    invoiceId: webhookData.invoiceId,
  };
}

module.exports = { initiateCheckout, verifyWebhook, extractPaymentDetails };
