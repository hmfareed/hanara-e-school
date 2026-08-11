const Guardian = require('../models/Guardian');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AcademicYear = require('../models/AcademicYear');
const SchoolProfile = require('../models/SchoolProfile');
const { generateReceipt, generateStatementPdf } = require('../services/pdf.service');

// Helper to check if a student belongs to the parent's guardian record
async function getGuardianAndValidateStudent(userId, refGuardianId, studentId = null) {
  if (!refGuardianId) {
    throw new Error('User is not linked to any guardian record');
  }

  const guardian = await Guardian.findById(refGuardianId);
  if (!guardian) {
    throw new Error('Guardian record not found');
  }

  if (studentId) {
    const ownsStudent = guardian.students.some(
      (id) => id.toString() === studentId.toString()
    );
    if (!ownsStudent) {
      throw new Error('Access denied: You are not a guardian of this student');
    }
  }

  return guardian;
}

// GET /api/parent/dashboard
const getParentDashboard = async (req, res, next) => {
  try {
    const guardian = await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian);

    // Fetch kids details
    const students = await Student.find({ _id: { $in: guardian.students }, status: 'active' })
      .populate('currentClass', 'name');

    const studentIds = students.map((s) => s._id);

    // Fetch invoices for these kids
    const invoices = await Invoice.find({ student: { $in: studentIds } })
      .populate('student', 'firstName lastName')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 });

    // Fetch last 5 payments
    const payments = await Payment.find({ student: { $in: studentIds }, status: 'successful' })
      .populate('student', 'firstName lastName')
      .populate('invoice', 'invoiceNumber')
      .sort({ paidAt: -1 })
      .limit(5);

    // Calculate billing summaries
    const totalFeesDue = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    // Get today's attendance status for all kids
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayAttendance = await AttendanceRecord.find({
      student: { $in: studentIds },
      date: { $gte: today, $lt: tomorrow },
    });

    const attendanceMap = todayAttendance.reduce((acc, record) => {
      acc[record.student.toString()] = record.status;
      return acc;
    }, {});

    const kidsSummary = students.map((student) => {
      return {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        className: student.currentClass?.name || 'Unassigned',
        todayStatus: attendanceMap[student._id.toString()] || 'unmarked',
      };
    });

    res.json({
      success: true,
      data: {
        guardian: {
          id: guardian._id,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
        },
        kids: kidsSummary,
        billing: {
          totalDue: totalFeesDue,
          totalPaid: totalPaid,
          outstanding: outstandingBalance,
        },
        recentPayments: payments,
        invoices: invoices.slice(0, 5),
      },
    });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children
const getParentChildren = async (req, res, next) => {
  try {
    const guardian = await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian);
    const students = await Student.find({ _id: { $in: guardian.students } })
      .populate({ path: 'currentClass', populate: { path: 'level', select: 'displayName category' } });
    
    res.json({ success: true, data: students });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/attendance
const getChildAttendance = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const { termId, from, to } = req.query;

    const filter = { student: studentId };
    if (termId) filter.term = termId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await AttendanceRecord.find(filter).sort({ date: -1 });

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    );

    summary.attendanceRate =
      summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : null;

    res.json({
      success: true,
      data: { summary, records },
    });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/invoices
const getChildInvoices = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const invoices = await Invoice.find({ student: studentId })
      .populate('feeStructure', 'items')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invoices });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/payments
const getChildPayments = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const payments = await Payment.find({ student: studentId, status: 'successful' })
      .populate('invoice', 'invoiceNumber')
      .sort({ paidAt: -1 });

    res.json({ success: true, data: payments });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/payments/:paymentId/receipt/pdf (Download MoMo / Fee Payment Receipt PDF)
const getPaymentReceiptPdf = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate('invoice');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Validate guardian owns this student
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, payment.student);

    const student = await Student.findById(payment.student);
    const schoolProfile = await SchoolProfile.findOne({});

    const pdfBuffer = await generateReceipt({
      payment,
      invoice: payment.invoice,
      student,
      schoolProfile,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt_${payment.receiptNumber || paymentId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/statement/pdf (Download Child Fee Statement PDF)
const getChildStatementPdf = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const student = await Student.findById(studentId).populate('currentClass');
    const invoices = await Invoice.find({ student: studentId }).sort({ createdAt: 1 });
    const payments = await Payment.find({ student: studentId, status: 'successful' }).sort({ createdAt: 1 });
    const schoolProfile = await SchoolProfile.findOne({});

    const pdfBuffer = await generateStatementPdf({
      student,
      invoices,
      payments,
      schoolProfile,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FeeStatement_${student.admissionNumber || studentId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/grades (Live Subject Performances across all subjects)
const getChildSubjectGrades = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const Grade = require('../models/Grade');
    const getGradeDetail = (score) => {
      if (score >= 80) return { grade: '1', remark: 'Highest Highest' };
      if (score >= 70) return { grade: '2', remark: 'Higher' };
      if (score >= 65) return { grade: '3', remark: 'High' };
      if (score >= 60) return { grade: '4', remark: 'High Average' };
      if (score >= 55) return { grade: '5', remark: 'Average' };
      if (score >= 50) return { grade: '6', remark: 'Low Average' };
      if (score >= 45) return { grade: '7', remark: 'Low' };
      if (score >= 40) return { grade: '8', remark: 'Lower' };
      return { grade: '9', remark: 'Lowest' };
    };

    const grades = await Grade.find({ student: studentId })
      .populate('subject', 'name code category')
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    const formattedGrades = grades.map((g) => {
      const detail = getGradeDetail(g.totalScore || 0);
      return {
        _id: g._id,
        subject: g.subject,
        academicYear: g.academicYear,
        term: g.term,
        classScore: g.classScore || 0,
        examScore: g.examScore || 0,
        totalScore: g.totalScore || 0,
        grade: detail.grade,
        remark: detail.remark,
        updatedAt: g.updatedAt,
      };
    });

    res.json({ success: true, data: formattedGrades });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// GET /api/parent/children/:id/daily-fees (Daily Feeding & Transport Bus Fee Collection Log)
const getChildDailyFeeHistory = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    await getGuardianAndValidateStudent(req.user.id, req.user.refGuardian, studentId);

    const FeeCollectionSubmission = require('../models/FeeCollectionSubmission');
    const student = await Student.findById(studentId);
    if (!student || !student.currentClass) {
      return res.json({ success: true, data: [] });
    }

    const submissions = await FeeCollectionSubmission.find({ class: student.currentClass })
      .sort({ date: -1 })
      .limit(60);

    const history = [];
    submissions.forEach((sub) => {
      const lineItem = sub.lineItems.find((item) => item.student.toString() === studentId.toString());
      if (lineItem) {
        history.push({
          submissionId: sub._id,
          date: sub.date,
          feedingStatus: lineItem.feedingStatus,
          feedingAmount: lineItem.feedingAmount,
          busStatus: lineItem.busStatus,
          busAmount: lineItem.busAmount,
          totalPaid: (lineItem.feedingStatus === 'paid' ? lineItem.feedingAmount : 0) + (lineItem.busStatus === 'paid' ? lineItem.busAmount : 0),
          submissionStatus: sub.status,
        });
      }
    });

    res.json({ success: true, data: history });
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not linked')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getParentDashboard,
  getParentChildren,
  getChildAttendance,
  getChildInvoices,
  getChildPayments,
  getPaymentReceiptPdf,
  getChildStatementPdf,
  getChildSubjectGrades,
  getChildDailyFeeHistory,
};
