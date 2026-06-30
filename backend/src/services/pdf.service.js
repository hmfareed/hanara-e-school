/**
 * pdf.service.js
 * Generates PDF receipts using pdf-lib (no headless Chrome).
 */
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Format Ghana cedis
 */
const formatGHS = (amount) =>
  `GH₵ ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

/**
 * generateReceipt({ payment, invoice, student, schoolProfile })
 * Returns a Buffer containing the PDF bytes.
 */
async function generateReceipt({ payment, invoice, student, schoolProfile }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]); // A5 portrait
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const colorBlue   = rgb(0.11, 0.25, 0.69); // #1B3FAF
  const colorDark   = rgb(0.1,  0.1,  0.1);
  const colorGray   = rgb(0.4,  0.4,  0.4);
  const colorGreen  = rgb(0.0,  0.53, 0.27); // #008844

  let y = height - 40;

  // ── Header ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: colorBlue });

  page.drawText(schoolProfile?.name || 'HANARA SCHOOLS', {
    x: 20, y: height - 28,
    font: fontBold, size: 16, color: rgb(1, 1, 1),
  });
  page.drawText('Official Payment Receipt', {
    x: 20, y: height - 48,
    font: fontReg, size: 10, color: rgb(0.8, 0.85, 1),
  });

  // Receipt # and date  (right-aligned area)
  const receiptLabel = `Receipt #: ${payment.receiptNumber || '—'}`;
  const dateLabel    = `Date: ${new Date(payment.paidAt).toLocaleDateString('en-GH', {
    day: '2-digit', month: 'short', year: 'numeric',
  })}`;
  page.drawText(receiptLabel, { x: width - 170, y: height - 28, font: fontBold, size: 9, color: rgb(1,1,1) });
  page.drawText(dateLabel,    { x: width - 170, y: height - 44, font: fontReg,  size: 9, color: rgb(0.85,0.9,1) });

  y = height - 90;

  // ── Student Info ─────────────────────────────────────────────────────────────
  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Unknown Student';
  const admNo = student?.admissionNumber || '—';
  const className = invoice?.class?.name || '—';

  page.drawText('BILLED TO', { x: 20, y, font: fontBold, size: 8, color: colorGray });
  y -= 16;
  page.drawText(studentName, { x: 20, y, font: fontBold, size: 13, color: colorDark });
  y -= 14;
  page.drawText(`Admission No: ${admNo}`, { x: 20, y, font: fontReg, size: 9, color: colorGray });
  y -= 12;
  page.drawText(`Class: ${className}`, { x: 20, y, font: fontReg, size: 9, color: colorGray });

  // ── Divider ───────────────────────────────────────────────────────────────────
  y -= 20;
  page.drawLine({ start: { x: 20, y }, end: { x: width - 20, y }, thickness: 0.5, color: rgb(0.85,0.85,0.85) });
  y -= 16;

  // ── Invoice summary ──────────────────────────────────────────────────────────
  page.drawText('INVOICE SUMMARY', { x: 20, y, font: fontBold, size: 8, color: colorGray });
  y -= 14;

  const rows = [
    ['Invoice Number', invoice?.invoiceNumber || '—'],
    ['Term',           `${invoice?.termName || '—'} · ${new Date().getFullYear()}`],
    ['Amount Due',     formatGHS(invoice?.amountDue  || 0)],
    ['Amount Paid',    formatGHS(invoice?.amountPaid || 0)],
    ['Balance',        formatGHS(invoice?.balance    || 0)],
  ];

  for (const [label, value] of rows) {
    page.drawText(label, { x: 20, y, font: fontReg, size: 9, color: colorGray });
    page.drawText(value, { x: width - 20 - fontBold.widthOfTextAtSize(value, 9), y, font: fontBold, size: 9, color: colorDark });
    y -= 14;
  }

  // ── Divider ───────────────────────────────────────────────────────────────────
  y -= 6;
  page.drawLine({ start: { x: 20, y }, end: { x: width - 20, y }, thickness: 0.5, color: rgb(0.85,0.85,0.85) });
  y -= 16;

  // ── This payment ─────────────────────────────────────────────────────────────
  page.drawText('THIS PAYMENT', { x: 20, y, font: fontBold, size: 8, color: colorGray });
  y -= 14;

  const methodLabel = {
    cash: 'Cash', bank: 'Bank Transfer', momo: 'Mobile Money', card: 'Card',
  }[payment.method] || payment.method;

  const payRows = [
    ['Amount Paid',    formatGHS(payment.amount)],
    ['Method',         methodLabel],
    ['Provider',       payment.provider !== 'manual' ? payment.provider.toUpperCase() : '—'],
    ['Transaction Ref', payment.transactionRef || '—'],
  ];

  for (const [label, value] of payRows) {
    page.drawText(label, { x: 20, y, font: fontReg, size: 9, color: colorGray });
    page.drawText(value, { x: width - 20 - fontReg.widthOfTextAtSize(value, 9), y, font: fontReg, size: 9, color: colorDark });
    y -= 14;
  }

  // ── Amount box ───────────────────────────────────────────────────────────────
  y -= 10;
  page.drawRectangle({ x: 20, y: y - 10, width: width - 40, height: 36, color: rgb(0.95, 0.98, 1), borderColor: colorBlue, borderWidth: 1 });
  page.drawText('AMOUNT PAID', { x: 30, y: y + 10, font: fontBold, size: 9, color: colorBlue });
  const amtStr = formatGHS(payment.amount);
  page.drawText(amtStr, {
    x: width - 20 - fontBold.widthOfTextAtSize(amtStr, 20),
    y: y + 5,
    font: fontBold, size: 20, color: colorGreen,
  });
  y -= 30;

  // ── Footer ────────────────────────────────────────────────────────────────────
  y = 40;
  page.drawLine({ start: { x: 20, y: y + 16 }, end: { x: width - 20, y: y + 16 }, thickness: 0.5, color: rgb(0.85,0.85,0.85) });
  page.drawText('This is a computer-generated receipt. No signature required.', {
    x: 20, y: y + 4, font: fontReg, size: 7, color: colorGray,
  });
  page.drawText(schoolProfile?.phone || '', {
    x: 20, y: y - 8, font: fontReg, size: 7, color: colorGray,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateReceipt };
