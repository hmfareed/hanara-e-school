const SmsLog = require('../models/SmsLog');
const logger = require('../utils/logger');

const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || '';
const ARKESEL_SENDER_ID = process.env.ARKESEL_SENDER_ID || 'HANARASCH';
const MOCK_MODE = !ARKESEL_API_KEY;

/**
 * Sends a single SMS message. If ARKESEL_API_KEY is not defined, it operates in mock mode.
 */
async function sendSms({ recipient, message, type, sentBy = null }) {
  const provider = MOCK_MODE ? 'mock' : 'arkesel';
  
  // Format recipient to look like a standard Ghana E.164 number if it doesn't already
  // Ghana local phone numbers are 10 digits e.g. 0244123456 or 233244123456. Let's make sure it is normalized.
  let formattedRecipient = recipient.trim().replace(/[\s-()]/g, '');
  if (formattedRecipient.startsWith('0')) {
    formattedRecipient = '233' + formattedRecipient.substring(1);
  } else if (!formattedRecipient.startsWith('+') && !formattedRecipient.startsWith('233')) {
    formattedRecipient = '233' + formattedRecipient;
  }
  
  // Create SMS Log in pending status
  const log = await SmsLog.create({
    recipient: formattedRecipient,
    message,
    type,
    provider,
    status: 'pending',
    sentBy,
  });

  if (MOCK_MODE) {
    logger.info(`[SMS MOCK DRIVER] To: ${formattedRecipient} | Msg: ${message}`);
    log.status = 'sent';
    await log.save();
    return { success: true, log };
  }

  // Real Arkesel gateway call
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    
    // Arkesel SMS endpoints (v2 or v1). v2 is typically: https://sms.arkesel.com/sms/api?action=send-sms
    // Let's use the typical Arkesel API format
    const url = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${ARKESEL_API_KEY}&to=${formattedRecipient}&from=${ARKESEL_SENDER_ID}&sms=${encodeURIComponent(message)}`;
    
    const response = await fetch(url);
    const data = await response.json(); // Usually returns { code: 'ok', balance: ..., ... } or { status: 'success', ... }
    
    // Normalize response checking
    const isSuccess = data.code === 'ok' || data.status === 'success' || data.code === '1000';
    if (isSuccess) {
      log.status = 'sent';
      log.cost = data.cost || 0;
      await log.save();
      logger.info(`[SMS Arkesel] Successfully sent message to ${formattedRecipient}`);
      return { success: true, log };
    } else {
      throw new Error(data.message || `Arkesel API returned code ${data.code}`);
    }
  } catch (error) {
    logger.error(`[SMS Arkesel Error] Failed to send message to ${formattedRecipient}: ${error.message}`);
    log.status = 'failed';
    log.error = error.message;
    await log.save();
    return { success: false, log, error: error.message };
  }
}

// Helpers
async function sendAbsenceAlert(student, guardian, date) {
  const dateStr = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const message = `Dear ${guardian.firstName} ${guardian.lastName}, please be informed that your child ${student.firstName} was absent from class today, ${dateStr}. Please contact the administration if you have questions. - HANARA SCHOOLS`;
  return sendSms({ recipient: guardian.phone, message, type: 'attendance_absence' });
}

async function sendInvoiceAlert(student, guardian, invoice) {
  const message = `Dear ${guardian.firstName} ${guardian.lastName}, a new invoice (${invoice.invoiceNumber}) of GHS ${invoice.amountDue.toFixed(2)} has been generated for ${student.firstName} for ${invoice.termName}. Due date is ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}. Thank you. - HANARA SCHOOLS`;
  return sendSms({ recipient: guardian.phone, message, type: 'fee_invoice' });
}

async function sendPaymentAlert(student, guardian, payment) {
  const message = `Dear ${guardian.firstName} ${guardian.lastName}, thank you for your payment of GHS ${payment.amount.toFixed(2)} for ${student.firstName}. Receipt: ${payment.receiptNumber}. Current outstanding balance: GHS ${payment.invoice.balance.toFixed(2)}. - HANARA SCHOOLS`;
  return sendSms({ recipient: guardian.phone, message, type: 'fee_payment' });
}

module.exports = {
  sendSms,
  sendAbsenceAlert,
  sendInvoiceAlert,
  sendPaymentAlert,
};
