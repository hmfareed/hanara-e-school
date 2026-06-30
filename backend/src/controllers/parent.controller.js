const Guardian = require('../models/Guardian');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AcademicYear = require('../models/AcademicYear');

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

module.exports = {
  getParentDashboard,
  getParentChildren,
  getChildAttendance,
  getChildInvoices,
  getChildPayments,
};
