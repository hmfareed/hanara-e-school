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

/* ─────────────────────────────────────────────────────────── */
/*  REPORT CARD PDF                                            */
/* ─────────────────────────────────────────────────────────── */

/**
 * generateReportCardPdf({ student, report, grades, gradingDetails, schoolProfile, academicYear, term })
 *
 * grades — array of { subject: { name, code }, totalScore, classScore, examScore }
 * gradingDetails — array of { subject: { name }, grade, label }  (from grading.service)
 * report — StudentReport doc (position, averages, remarks, attendance)
 * Returns a Buffer containing A4 PDF bytes.
 */
async function generateReportCardPdf({
  student,
  report,
  grades,
  gradingDetails,
  schoolProfile,
  academicYear,
  term,
}) {
  const { PDFDocument: PDF, rgb: c, StandardFonts: SF } = require('pdf-lib');

  const doc = await PDF.create();
  // A4 portrait: 595 x 842 pt
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const bold = await doc.embedFont(SF.HelveticaBold);
  const reg  = await doc.embedFont(SF.Helvetica);

  const green  = c(0.067, 0.416, 0.298); // #116a4c
  const dark   = c(0.08, 0.08, 0.08);
  const gray   = c(0.45, 0.45, 0.45);
  const ltGray = c(0.93, 0.93, 0.93);
  const white  = c(1, 1, 1);
  const red    = c(0.75, 0.1, 0.1);

  let y = height - 20;

  /* ── Header Banner ──────────────────────────────────── */
  page.drawRectangle({ x: 0, y: y - 60, width, height: 70, color: green });
  page.drawText(schoolProfile?.name?.toUpperCase() || 'HANARA SCHOOLS', {
    x: 24, y: y - 22, font: bold, size: 15, color: white,
  });
  page.drawText('TERMINAL REPORT CARD', {
    x: 24, y: y - 40, font: reg, size: 9.5, color: c(0.78, 0.95, 0.87),
  });

  // Right: Year / Term
  const yearLabel = `${academicYear}  ·  Term ${term}`;
  const ylw = bold.widthOfTextAtSize(yearLabel, 9);
  page.drawText(yearLabel, { x: width - ylw - 24, y: y - 28, font: bold, size: 9, color: white });

  y -= 80;

  /* ── Student Info Card ──────────────────────────────── */
  page.drawRectangle({ x: 20, y: y - 64, width: width - 40, height: 68, color: ltGray });

  const studentName = `${student.firstName}${student.otherNames ? ' ' + student.otherNames : ''} ${student.lastName}`;
  page.drawText(studentName, { x: 28, y: y - 16, font: bold, size: 13, color: dark });

  const infoItems = [
    ['Admission No.', student.admissionNumber || '—'],
    ['Class',        student.currentClass?.name || '—'],
    ['Position',     report?.position ? `${report.position} / ${report.totalStudents}` : '—'],
    ['Average',      report?.studentAverage != null ? `${report.studentAverage}%` : '—'],
  ];

  let infoX = 28;
  infoItems.forEach(([label, value]) => {
    page.drawText(label, { x: infoX, y: y - 35, font: reg, size: 7.5, color: gray });
    page.drawText(value, { x: infoX, y: y - 48, font: bold, size: 9, color: dark });
    infoX += 130;
  });

  y -= 78;

  /* ── Grades Table ───────────────────────────────────── */
  const tableLeft = 20;
  const colWidths = [170, 55, 55, 55, 40, 80]; // Subject | CA/30 | Exam/70 | Total | Grade | Remark
  const colHeaders = ['Subject', 'Class Score\n(/30)', 'Exam Score\n(/70)', 'Total\n(/100)', 'Grade', 'Remark'];
  const rowH = 18;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0); // = 455 (fits in 555)

  // Header row
  page.drawRectangle({ x: tableLeft, y: y - rowH, width: tableWidth, height: rowH, color: green });

  let cx = tableLeft;
  colHeaders.forEach((h, i) => {
    const lines = h.split('\n');
    const textY = lines.length > 1 ? y - 8 : y - 12;
    lines.forEach((line, li) => {
      page.drawText(line, {
        x: cx + 4, y: textY - li * 8,
        font: bold, size: 7, color: white,
      });
    });
    cx += colWidths[i];
  });

  y -= rowH;

  // Data rows
  const mergedGrades = grades.map((g) => {
    const detail = (gradingDetails || []).find(
      (d) => d.subjectId?.toString() === g.subject?._id?.toString()
    );
    return { ...g, grade: detail?.grade || '—', label: detail?.label || '—' };
  });

  mergedGrades.forEach((g, idx) => {
    const rowColor = idx % 2 === 0 ? white : c(0.97, 0.98, 0.97);
    page.drawRectangle({ x: tableLeft, y: y - rowH, width: tableWidth, height: rowH, color: rowColor });

    const rowData = [
      g.subject?.name || '—',
      String(g.classScore ?? '—'),
      String(g.examScore ?? '—'),
      String(g.totalScore ?? '—'),
      String(g.grade),
      g.label,
    ];

    let rx = tableLeft;
    rowData.forEach((val, ci) => {
      const textColor = ci === 4 && g.grade === '9' ? red : dark;
      page.drawText(String(val), {
        x: rx + 4, y: y - 12,
        font: ci === 0 ? reg : bold,
        size: 7.5,
        color: textColor,
        maxWidth: colWidths[ci] - 6,
      });
      rx += colWidths[ci];
    });

    // Thin border line
    page.drawLine({
      start: { x: tableLeft, y: y - rowH },
      end:   { x: tableLeft + tableWidth, y: y - rowH },
      thickness: 0.3,
      color: c(0.85, 0.85, 0.85),
    });

    y -= rowH;
  });

  y -= 14;

  /* ── Attendance Summary ─────────────────────────────── */
  const att = report?.attendanceSummary || { present: 0, absent: 0, total: 0 };
  page.drawText('ATTENDANCE SUMMARY', { x: tableLeft, y, font: bold, size: 8, color: gray });
  y -= 14;
  const attItems = [
    ['Days Present', att.present],
    ['Days Absent',  att.absent],
    ['School Days',  att.total],
  ];
  let ax = tableLeft;
  attItems.forEach(([label, val]) => {
    page.drawRectangle({ x: ax, y: y - 26, width: 100, height: 28, color: ltGray });
    page.drawText(label, { x: ax + 6, y: y - 10, font: reg, size: 7, color: gray });
    page.drawText(String(val), { x: ax + 6, y: y - 22, font: bold, size: 11, color: dark });
    ax += 108;
  });

  y -= 40;

  /* ── Remarks ────────────────────────────────────────── */
  if (y > 180) {
    page.drawLine({ start: { x: tableLeft, y }, end: { x: width - 20, y }, thickness: 0.4, color: ltGray });
    y -= 14;

    const drawRemark = (label, text, startY) => {
      page.drawText(label.toUpperCase(), { x: tableLeft, y: startY, font: bold, size: 7.5, color: gray });
      page.drawRectangle({ x: tableLeft, y: startY - 26, width: width - 40, height: 28, color: c(0.97, 0.97, 0.97) });
      page.drawText(text || 'N/A', { x: tableLeft + 6, y: startY - 16, font: reg, size: 8.5, color: dark, maxWidth: width - 60 });
      return startY - 40;
    };

    y = drawRemark("Class Teacher's Remark", report?.classTeacherRemark || report?.conductRemarks, y);
    if (y > 130) {
      y = drawRemark("Head Teacher's Remark", report?.headTeacherRemark, y);
    }

    /* ── Promotion Decision ─────────────────────────── */
    if (report?.promotionDecision && y > 100) {
      y -= 4;
      page.drawText('PROMOTION DECISION:', { x: tableLeft, y, font: bold, size: 8, color: gray });
      page.drawText(report.promotionDecision, { x: tableLeft + 120, y, font: bold, size: 8.5, color: dark });
      y -= 18;
    }
  }

  /* ── Signature Line ─────────────────────────────────── */
  const sigY = 60;
  const sigItems = ["Class Teacher's Signature", "Head Teacher's Signature", "Parent / Guardian's Signature"];
  let sx = tableLeft;
  sigItems.forEach((label) => {
    page.drawLine({ start: { x: sx, y: sigY + 14 }, end: { x: sx + 140, y: sigY + 14 }, thickness: 0.5, color: gray });
    page.drawText(label, { x: sx, y: sigY, font: reg, size: 6.5, color: gray });
    sx += 155;
  });

  /* ── Footer ─────────────────────────────────────────── */
  page.drawText(
    'This report was generated by HANARA Schools Management System. For queries contact the school office.',
    { x: tableLeft, y: 30, font: reg, size: 6, color: gray }
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}


/* ═══════════════════════════════════════════════════════════════
   MOCK EXAM SLIP  (JHS 3 / BECE Preparation)
═══════════════════════════════════════════════════════════════ */

/**
 * generateMockSlipPdf({ student, series, results, aggregate, schoolProfile, trend })
 * Returns a Buffer containing a single student's mock exam result slip.
 */
async function generateMockSlipPdf({ student, series, results = [], aggregate, schoolProfile, trend = [] }) {
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const colorDark    = rgb(0.08, 0.08, 0.15);
  const colorBlue    = rgb(0.10, 0.20, 0.60);
  const colorGreen   = rgb(0.06, 0.54, 0.35);
  const colorAmber   = rgb(0.80, 0.50, 0.05);
  const colorGray    = rgb(0.45, 0.45, 0.50);
  const colorLightBg = rgb(0.96, 0.97, 0.99);
  const colorBorder  = rgb(0.85, 0.87, 0.92);
  const colorRed     = rgb(0.72, 0.12, 0.12);

  let y = height - 20;

  // ── Header band ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: colorBlue });

  const schoolName = schoolProfile?.name || 'HANARA SCHOOLS';
  page.drawText(schoolName, {
    x: 30, y: height - 35,
    font: fontBold, size: 18, color: rgb(1, 1, 1),
  });
  page.drawText('JHS 3 Mock Examination Result Slip', {
    x: 30, y: height - 55,
    font: fontReg, size: 11, color: rgb(0.8, 0.85, 1),
  });
  page.drawText(`Series: ${series?.name || '—'} | Year: ${series?.academicYear || '—'}`, {
    x: 30, y: height - 70,
    font: fontReg, size: 9, color: rgb(0.75, 0.8, 0.95),
  });

  y = height - 100;

  // ── Student Info box ─────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 50, width: width - 60, height: 55, color: colorLightBg, borderColor: colorBorder, borderWidth: 1 });
  const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  page.drawText(`Student: ${studentName}`, { x: 40, y: y - 16, font: fontBold, size: 11, color: colorDark });
  page.drawText(`Admission No.: ${student?.admissionNumber || '—'}`, { x: 40, y: y - 32, font: fontReg, size: 9, color: colorGray });
  page.drawText(`Class: ${student?.currentClass?.name || '—'}`, { x: 280, y: y - 16, font: fontReg, size: 9, color: colorGray });
  page.drawText(`Generated: ${new Date().toLocaleDateString('en-GH')}`, { x: 280, y: y - 32, font: fontReg, size: 9, color: colorGray });

  y -= 70;

  // ── Subjects table ───────────────────────────────────────────
  const tableX = 30;
  const colWidths = [230, 90, 60, 80]; // Subject, Score, Grade, Core/Elective
  const rowH = 22;
  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Table header
  page.drawRectangle({ x: tableX, y: y - rowH, width: totalTableWidth, height: rowH, color: colorBlue });
  const headers = ['Subject', 'Raw Score (/100)', 'Grade (1–9)', 'Type'];
  let hx = tableX + 8;
  headers.forEach((h, i) => {
    page.drawText(h, { x: hx, y: y - 14, font: fontBold, size: 8, color: rgb(1, 1, 1) });
    hx += colWidths[i];
  });
  y -= rowH;

  // Sort: core first, then electives
  const coreRows = results.filter((r) => r.isCore);
  const electiveRows = results.filter((r) => !r.isCore);
  const sortedResults = [...coreRows, ...electiveRows];

  let rowIndex = 0;
  for (const result of sortedResults) {
    const bg = rowIndex % 2 === 0 ? rgb(1, 1, 1) : colorLightBg;
    page.drawRectangle({ x: tableX, y: y - rowH, width: totalTableWidth, height: rowH, color: bg, borderColor: colorBorder, borderWidth: 0.5 });

    const subjectName = result.subjectId?.name || '—';
    const rawScore = result.rawScore !== null && result.rawScore !== undefined ? result.rawScore.toString() : '—';
    const grade = result.grade !== null && result.grade !== undefined ? result.grade.toString() : '—';
    const type = result.isCore ? 'Core' : 'Elective';

    const gradeColor = result.grade <= 3 ? colorGreen : result.grade <= 6 ? colorAmber : colorRed;
    const row = [subjectName, rawScore, grade, type];
    const colors = [colorDark, colorDark, gradeColor, result.isCore ? colorBlue : colorGray];

    let rx = tableX + 8;
    row.forEach((val, i) => {
      page.drawText(val, { x: rx, y: y - 14, font: i === 2 ? fontBold : fontReg, size: 9, color: colors[i] });
      rx += colWidths[i];
    });
    y -= rowH;
    rowIndex++;
  }

  if (sortedResults.length === 0) {
    page.drawText('No submitted results yet for this series.', { x: tableX + 8, y: y - 14, font: fontReg, size: 9, color: colorGray });
    y -= rowH;
  }

  y -= 16;

  // ── Aggregate summary box ─────────────────────────────────────
  if (aggregate) {
    const boxH = aggregate.isComplete ? 90 : 70;
    page.drawRectangle({ x: 30, y: y - boxH, width: width - 60, height: boxH, color: colorLightBg, borderColor: colorBorder, borderWidth: 1 });

    page.drawText('AGGREGATE SUMMARY', { x: 40, y: y - 16, font: fontBold, size: 9, color: colorBlue });

    if (aggregate.isComplete) {
      page.drawText(`Total Aggregate: ${aggregate.aggregate}`, { x: 40, y: y - 32, font: fontBold, size: 13, color: colorDark });
      page.drawText(`(Lower is better — WAEC 9-point scale)`, { x: 40, y: y - 46, font: fontReg, size: 8, color: colorGray });
      page.drawText(`Class Position: ${aggregate.classPosition || '—'}`, { x: 40, y: y - 62, font: fontReg, size: 9, color: colorDark });
      page.drawText(`Cohort Position: ${aggregate.cohortPosition || '—'}`, { x: 220, y: y - 62, font: fontReg, size: 9, color: colorDark });
      const coreSum = aggregate.coreGrades?.reduce((s, g) => s + g.grade, 0) || 0;
      const electiveSum = aggregate.bestElectivesUsed?.reduce((s, g) => s + g.grade, 0) || 0;
      page.drawText(`Core (4): ${coreSum}  +  Best 2 Electives: ${electiveSum}  =  ${aggregate.aggregate}`, { x: 40, y: y - 78, font: fontReg, size: 8, color: colorGray });
    } else {
      page.drawText('Aggregate: PROVISIONAL (not all required subjects submitted)', { x: 40, y: y - 32, font: fontBold, size: 9, color: colorAmber });
      const coreCount = aggregate.coreGrades?.length || 0;
      const electiveCount = aggregate.electiveGrades?.length || 0;
      page.drawText(`Submitted: ${coreCount}/4 core subjects, ${electiveCount} electives`, { x: 40, y: y - 48, font: fontReg, size: 9, color: colorGray });
    }
    y -= boxH + 12;
  }

  // ── Trend table (if multi-series data exists) ─────────────────
  const trendData = trend.filter((t) => t.aggregate?.aggregate !== null && t.aggregate?.aggregate !== undefined);
  if (trendData.length > 1) {
    page.drawText('PERFORMANCE TREND', { x: 30, y, font: fontBold, size: 9, color: colorBlue });
    y -= 18;

    const trendCols = [160, 90, 80, 80];
    const trendHeaders = ['Series', 'Aggregate', 'Class Pos.', 'Cohort Pos.'];
    page.drawRectangle({ x: 30, y: y - rowH, width: trendCols.reduce((a, b) => a + b, 0), height: rowH, color: colorBlue });
    let thx = 38;
    trendHeaders.forEach((h, i) => {
      page.drawText(h, { x: thx, y: y - 14, font: fontBold, size: 8, color: rgb(1, 1, 1) });
      thx += trendCols[i];
    });
    y -= rowH;

    trendData.forEach((t, ri) => {
      const bg = ri % 2 === 0 ? rgb(1, 1, 1) : colorLightBg;
      const trendRow = [
        t.series?.name || '—',
        t.aggregate?.aggregate?.toString() || '—',
        t.aggregate?.classPosition?.toString() || '—',
        t.aggregate?.cohortPosition?.toString() || '—',
      ];
      page.drawRectangle({ x: 30, y: y - rowH, width: trendCols.reduce((a, b) => a + b, 0), height: rowH, color: bg, borderColor: colorBorder, borderWidth: 0.5 });
      let trx = 38;
      trendRow.forEach((val, i) => {
        page.drawText(val, { x: trx, y: y - 14, font: fontReg, size: 9, color: colorDark });
        trx += trendCols[i];
      });
      y -= rowH;
    });
    y -= 12;
  }

  // ── Disclaimer ───────────────────────────────────────────────
  const disclaimer = 'This is a mock assessment result for internal use only. It is NOT an official BECE result and should not be mistaken for a WAEC document.';
  page.drawText(disclaimer, {
    x: 30, y: 40,
    font: fontReg, size: 7.5, color: colorAmber, maxWidth: width - 60,
    lineHeight: 12,
  });
  page.drawText(`Generated by HANARA School Management System — ${new Date().toISOString()}`, {
    x: 30, y: 28, font: fontReg, size: 7, color: colorGray,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * generateMockSlipZip(slips)
 * slips: Array<{ filename: string, buffer: Buffer }>
 * Returns a Buffer containing a zip archive of all PDFs.
 */
async function generateMockSlipZip(slips) {
  const archiver = require('archiver');
  const { PassThrough } = require('stream');

  return new Promise((resolve, reject) => {
    const chunks = [];
    const passThrough = new PassThrough();
    passThrough.on('data', (chunk) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', reject);
    archive.pipe(passThrough);

    slips.forEach(({ filename, buffer }) => {
      archive.append(buffer, { name: filename });
    });

    archive.finalize();
  });
}

module.exports = { generateReceipt, generateReportCardPdf, generateMockSlipPdf, generateMockSlipZip };


