const FeeCollectionSubmission = require('../models/FeeCollectionSubmission');
const FeeCollectionCorrection = require('../models/FeeCollectionCorrection');
const DailyFeeStructure = require('../models/DailyFeeStructure');
const Student = require('../models/Student');
const Class = require('../models/Class');
const AttendanceRecord = require('../models/AttendanceRecord');
const socketService = require('../services/socket.service');
const logger = require('../utils/logger');

// Utility to normalize date to midnight UTC
const normalizeDate = (dateString) => {
  const date = new Date(dateString);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// Helper to look up active DailyFeeStructure for a class and date using the hierarchy
const getActiveFeeStructure = async (classId, date) => {
  const targetClass = await Class.findById(classId);
  if (!targetClass) return { feedingFeeAmount: 0, busFareAmount: 0 };

  const searchDate = normalizeDate(date);

  // Find all fee structures with effectiveStartDate <= searchDate
  const structures = await DailyFeeStructure.find({
    effectiveStartDate: { $lte: searchDate },
  }).sort({ effectiveStartDate: -1 });

  // 1. Check for specific class match
  const classMatch = structures.find(
    (s) => s.class && s.class.toString() === classId.toString()
  );
  if (classMatch) return classMatch;

  // 2. Check for ClassLevel grade level match
  const levelMatch = structures.find(
    (s) => s.level && s.level.toString() === targetClass.level.toString()
  );
  if (levelMatch) return levelMatch;

  // 3. Fallback to school-wide default (both class and level are null)
  const schoolWideMatch = structures.find((s) => !s.class && !s.level);
  if (schoolWideMatch) return schoolWideMatch;

  // Global system hardcoded defaults if nothing is in DB
  return { feedingFeeAmount: 4, busFareAmount: 5 };
};

// Helper to compute reconciled state of a submission on-the-fly
const computeReconciledSubmission = async (submissionId) => {
  const submission = await FeeCollectionSubmission.findById(submissionId)
    .populate('class', 'name level')
    .populate('submittingTeacher', 'email')
    .populate('confirmedBy', 'email')
    .populate('lineItems.student', 'firstName lastName admissionNumber transport');

  if (!submission) return null;

  const corrections = await FeeCollectionCorrection.find({ submission: submissionId })
    .populate('student', 'firstName lastName admissionNumber')
    .populate('correctedBy', 'email')
    .sort({ timestamp: 1 });

  // Map original line items
  const reconciledLineItems = submission.lineItems.map((item) => {
    const studentObj = item.student;
    return {
      studentId: studentObj._id.toString(),
      name: `${studentObj.firstName} ${studentObj.lastName}`,
      admissionNumber: studentObj.admissionNumber,
      usesBus: studentObj.transport?.usesBus || false,
      stop: studentObj.transport?.stop || '',
      originalFeedingStatus: item.feedingStatus,
      originalFeedingAmount: item.feedingAmount,
      originalBusStatus: item.busStatus,
      originalBusAmount: item.busAmount,
      // Default reconciled fields to original values
      feedingStatus: item.feedingStatus,
      feedingAmount: item.feedingAmount,
      busStatus: item.busStatus,
      busAmount: item.busAmount,
      studentCorrections: [],
    };
  });

  // Layer corrections sequentially
  corrections.forEach((corr) => {
    const item = reconciledLineItems.find(
      (li) => li.studentId === corr.student._id.toString()
    );
    if (item) {
      item.studentCorrections.push({
        correctedBy: corr.correctedBy?.email,
        reason: corr.reason,
        timestamp: corr.timestamp,
        previousFeedingStatus: item.feedingStatus,
        previousFeedingAmount: item.feedingAmount,
        previousBusStatus: item.busStatus,
        previousBusAmount: item.busAmount,
        newFeedingStatus: corr.feedingStatus,
        newFeedingAmount: corr.feedingAmount,
        newBusStatus: corr.busStatus,
        newBusAmount: corr.busAmount,
      });

      item.feedingStatus = corr.feedingStatus;
      item.feedingAmount = corr.feedingAmount;
      item.busStatus = corr.busStatus;
      item.busAmount = corr.busAmount;
    }
  });

  // Recompute reconciled totals
  let feedingTotal = 0;
  let busFareTotal = 0;

  reconciledLineItems.forEach((item) => {
    // Only sum payments actually marked as paid (or standard sum of amounts)
    feedingTotal += item.feedingAmount;
    busFareTotal += item.busAmount;
  });

  const grandTotal = feedingTotal + busFareTotal;

  return {
    submission,
    corrections,
    reconciledLineItems,
    reconciledTotals: {
      feedingTotal,
      busFareTotal,
      grandTotal,
    },
  };
};

// GET /api/fees/daily-register (Teacher / Admin form view)
const getDailyRegister = async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ success: false, message: 'classId and date are required' });
    }

    const searchDate = normalizeDate(date);

    // 1. Check if a submission already exists
    const existingSubmission = await FeeCollectionSubmission.findOne({
      class: classId,
      date: searchDate,
    });

    if (existingSubmission) {
      const reconciled = await computeReconciledSubmission(existingSubmission._id);
      return res.json({
        success: true,
        exists: true,
        data: reconciled.submission,
        reconciledLineItems: reconciled.reconciledLineItems,
        reconciledTotals: reconciled.reconciledTotals,
        corrections: reconciled.corrections,
      });
    }

    // 2. Fetch Active Daily Fee Rates for this class & date
    const feeStructure = await getActiveFeeStructure(classId, searchDate);

    // 3. Fetch Student Roster
    const students = await Student.find({ currentClass: classId, status: 'active' })
      .select('firstName lastName admissionNumber transport')
      .sort({ lastName: 1, firstName: 1 });

    // 4. Fetch Attendance records for this class & date to auto-prefill 'absent' status
    const attendanceRecords = await AttendanceRecord.find({
      class: classId,
      date: searchDate,
    });

    // 5. Pre-fill line items
    const lineItems = students.map((student) => {
      const attendance = attendanceRecords.find(
        (a) => a.student.toString() === student._id.toString()
      );
      const isAbsent = attendance?.status === 'absent';

      return {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          transport: student.transport,
        },
        feedingStatus: isAbsent ? 'absent' : 'unpaid',
        feedingAmount: isAbsent ? 0 : feeStructure.feedingFeeAmount,
        busStatus: isAbsent ? 'absent' : 'unpaid',
        // Only charge bus fare if student uses bus and is not absent
        busAmount: isAbsent ? 0 : (student.transport?.usesBus ? feeStructure.busFareAmount : 0),
      };
    });

    res.json({
      success: true,
      exists: false,
      data: {
        date: searchDate,
        class: classId,
        lineItems,
        rates: {
          feedingFeeAmount: feeStructure.feedingFeeAmount,
          busFareAmount: feeStructure.busFareAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register (Submit Daily Register - Teacher)
const submitDailyRegister = async (req, res, next) => {
  try {
    const { classId, date, lineItems } = req.body;

    const saveDate = normalizeDate(date);

    // Verify class exists
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // RBAC check: Class Teachers can only submit for their assigned class
    const isTeacher = req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher'));
    const userIdStr = (req.user.id || req.user._id)?.toString();
    const refStaffIdStr = (req.user.refStaff?._id || req.user.refStaff)?.toString();

    const isClassTeacher =
      (targetClass.formTeacher && targetClass.formTeacher.toString() === userIdStr) ||
      (targetClass.classTeacher && refStaffIdStr && targetClass.classTeacher.toString() === refStaffIdStr);

    if (isTeacher && !isClassTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not the form or class teacher for this class',
      });
    }

    // Check if register already exists
    const existing = await FeeCollectionSubmission.findOne({ class: classId, date: saveDate });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A fee collection register has already been submitted for this class and date',
      });
    }

    // Compute expected totals
    let feedingTotal = 0;
    let busFareTotal = 0;

    const processedLineItems = lineItems.map((item) => {
      const feedPaid = item.feedingStatus === 'paid';
      const busPaid = item.busStatus === 'paid';

      const feedingAmount = feedPaid ? item.feedingAmount : 0;
      const busAmount = busPaid ? item.busAmount : 0;

      feedingTotal += feedingAmount;
      busFareTotal += busAmount;

      return {
        student: item.student,
        feedingStatus: item.feedingStatus,
        feedingAmount,
        busStatus: item.busStatus,
        busAmount,
      };
    });

    const submission = await FeeCollectionSubmission.create({
      class: classId,
      submittingTeacher: req.user.id,
      date: saveDate,
      lineItems: processedLineItems,
      totals: {
        feedingTotal,
        busFareTotal,
        grandTotal: feedingTotal + busFareTotal,
      },
      status: 'pending',
    });

    // Populate class & teacher info for the live feed
    const populated = await FeeCollectionSubmission.findById(submission._id)
      .populate('class', 'name')
      .populate('submittingTeacher', 'email');

    // Emit real-time Socket.io event to Accountants dashboard
    socketService.emitToAccountants('newSubmission', populated);

    logger.info(`Daily fee collection submitted for class ${targetClass.name} on ${saveDate.toISOString().split('T')[0]}`);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register/:id/corrections (Create Correction)
const createCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId, feedingStatus, feedingAmount, busStatus, busAmount, reason } = req.body;

    const submission = await FeeCollectionSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Enforce that corrections are only added if the submission status is not already settled or confirmed
    if (submission.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create corrections on already confirmed submissions',
      });
    }

    // Save correction record
    const correction = await FeeCollectionCorrection.create({
      submission: id,
      correctedBy: req.user.id,
      student: studentId,
      feedingStatus,
      feedingAmount: feedingStatus === 'paid' ? feedingAmount : 0,
      busStatus,
      busAmount: busStatus === 'paid' ? busAmount : 0,
      reason,
    });

    // Compute updated reconciled totals
    const reconciled = await computeReconciledSubmission(id);

    // Emit live Socket event to accountants room
    socketService.emitToAccountants('newCorrection', {
      submissionId: id,
      correction,
      reconciledTotals: reconciled.reconciledTotals,
    });

    res.status(201).json({
      success: true,
      message: 'Correction registered successfully',
      data: correction,
      reconciledTotals: reconciled.reconciledTotals,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/submissions (Accountant dashboard queue query)
const getSubmissions = async (req, res, next) => {
  try {
    const { status, date, classId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (classId) filter.class = classId;
    if (date) filter.date = normalizeDate(date);

    // If teacher logs in, restrict to their assigned classes
    if (req.user.role === 'teacher') {
      const userIdStr = (req.user.id || req.user._id)?.toString();
      const refStaffIdStr = (req.user.refStaff?._id || req.user.refStaff)?.toString();

      const teacherClasses = await Class.find({
        $or: [
          { formTeacher: userIdStr },
          ...(refStaffIdStr ? [{ classTeacher: refStaffIdStr }] : [])
        ]
      }).distinct('_id');

      if (teacherClasses.length === 0) {
        return res.json({ success: true, data: [] });
      }
      filter.class = { $in: teacherClasses };
    }

    const submissions = await FeeCollectionSubmission.find(filter)
      .populate('class', 'name')
      .populate('submittingTeacher', 'email')
      .populate('confirmedBy', 'email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/submissions/:id (Get full details + history)
const getSubmissionDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reconciled = await computeReconciledSubmission(id);
    if (!reconciled) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({
      success: true,
      data: reconciled.submission,
      reconciledLineItems: reconciled.reconciledLineItems,
      reconciledTotals: reconciled.reconciledTotals,
      corrections: reconciled.corrections,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register/submissions/:id/confirm (Accountant reconciliation endpoint)
const confirmSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actuallyCountedAmount, action, discrepancyNotes } = req.body;

    const submission = await FeeCollectionSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Get reconciled expected total
    const reconciled = await computeReconciledSubmission(id);
    const expectedTotal = reconciled.reconciledTotals.grandTotal;

    if (action === 'confirm') {
      // Validate that counted matches expected total
      if (Math.abs(actuallyCountedAmount - expectedTotal) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Reconciliation Error: Counted amount (${actuallyCountedAmount} GHS) does not match system expected total (${expectedTotal} GHS). You must flag this as a discrepancy.`,
        });
      }

      submission.status = 'confirmed';
      submission.actuallyCountedAmount = actuallyCountedAmount;
      submission.discrepancyNotes = '';
    } else if (action === 'flag') {
      if (!discrepancyNotes || discrepancyNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Discrepancy explanation notes are required when flagging a discrepancy',
        });
      }

      submission.status = 'discrepancy_flagged';
      submission.actuallyCountedAmount = actuallyCountedAmount;
      submission.discrepancyNotes = discrepancyNotes;

      // Raise live socket alert specifically to the submitting teacher
      socketService.emitToUser(
        submission.submittingTeacher.toString(),
        'discrepancyAlert',
        {
          submissionId: id,
          classId: submission.class.toString(),
          message: `Discrepancy flagged by Accounts Office on daily register collection for date ${submission.date.toISOString().split('T')[0]}. Expected: ${expectedTotal} GHS, Counted: ${actuallyCountedAmount} GHS. Reason: ${discrepancyNotes}`,
        }
      );
    }

    submission.confirmedBy = req.user.id;
    submission.confirmedAt = new Date();
    await submission.save();

    const updated = await computeReconciledSubmission(id);

    // Emit live status update event to accountants room
    socketService.emitToAccountants('submissionStatusChanged', {
      submissionId: id,
      status: submission.status,
      actuallyCountedAmount: submission.actuallyCountedAmount,
      discrepancyNotes: submission.discrepancyNotes,
    });

    res.json({
      success: true,
      message: `Daily register status set to ${submission.status} successfully`,
      data: updated.submission,
      reconciledTotals: updated.reconciledTotals,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register/submissions/:id/resolve (Resolve discrepancy)
const resolveDiscrepancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actuallyCountedAmount, resolutionNotes } = req.body;

    const submission = await FeeCollectionSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.status !== 'discrepancy_flagged') {
      return res.status(400).json({ success: false, message: 'This submission is not flagged as a discrepancy' });
    }

    submission.status = 'resolved';
    if (actuallyCountedAmount !== undefined) {
      submission.actuallyCountedAmount = actuallyCountedAmount;
    }
    submission.discrepancyNotes = `[RESOLVED] ${resolutionNotes || 'Discrepancy resolved by Accounts Office'}`;
    submission.confirmedBy = req.user.id;
    submission.confirmedAt = new Date();
    await submission.save();

    const updated = await computeReconciledSubmission(id);

    // Emit socket event
    socketService.emitToAccountants('submissionStatusChanged', {
      submissionId: id,
      status: 'resolved',
      actuallyCountedAmount: submission.actuallyCountedAmount,
      discrepancyNotes: submission.discrepancyNotes,
    });

    res.json({
      success: true,
      message: 'Flagged discrepancy resolved successfully',
      data: updated.submission,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/reports (Reconciled Reporting Analytics)
const getCollectionReports = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? normalizeDate(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? normalizeDate(endDate) : new Date();
    end.setUTCHours(23, 59, 59, 999);

    // 1. Fetch confirmed and resolved submissions inside range
    const submissions = await FeeCollectionSubmission.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'resolved'] },
    }).populate('class', 'name');

    // 2. Fetch all corrections associated with these submissions
    const submissionIds = submissions.map((s) => s._id);
    const corrections = await FeeCollectionCorrection.find({ submission: { $in: submissionIds } });

    // Compute reconciled totals day-by-day and class-by-class
    let totalFeedingCollected = 0;
    let totalBusFareCollected = 0;

    const dailySummaryMap = {};
    const classSummaryMap = {};

    submissions.forEach((sub) => {
      const dateStr = sub.date.toISOString().split('T')[0];
      const className = sub.class?.name || 'Unknown Class';

      let subFeeding = sub.totals.feedingTotal;
      let subBus = sub.totals.busFareTotal;

      // Filter corrections for this specific submission
      const subCorrs = corrections.filter((c) => c.submission.toString() === sub._id.toString());
      
      // Calculate adjusted values using corrections
      const studentCorrectionMap = {};
      subCorrs.forEach((corr) => {
        studentCorrectionMap[corr.student.toString()] = corr;
      });

      // Recalculate original items that were corrected
      sub.lineItems.forEach((item) => {
        const corr = studentCorrectionMap[item.student.toString()];
        if (corr) {
          // Subtract original amount and add corrected amount
          subFeeding = subFeeding - item.feedingAmount + corr.feedingAmount;
          subBus = subBus - item.busAmount + corr.busAmount;
        }
      });

      const totalCollected = subFeeding + subBus;
      totalFeedingCollected += subFeeding;
      totalBusFareCollected += subBus;

      // Group by Date
      if (!dailySummaryMap[dateStr]) {
        dailySummaryMap[dateStr] = { date: dateStr, feeding: 0, bus: 0, total: 0 };
      }
      dailySummaryMap[dateStr].feeding += subFeeding;
      dailySummaryMap[dateStr].bus += subBus;
      dailySummaryMap[dateStr].total += totalCollected;

      // Group by Class
      if (!classSummaryMap[className]) {
        classSummaryMap[className] = { className, feeding: 0, bus: 0, total: 0, submissionsCount: 0 };
      }
      classSummaryMap[className].feeding += subFeeding;
      classSummaryMap[className].bus += subBus;
      classSummaryMap[className].total += totalCollected;
      classSummaryMap[className].submissionsCount += 1;
    });

    const dailySummary = Object.values(dailySummaryMap).sort((a, b) => a.date.localeCompare(b.date));
    const classSummaries = Object.values(classSummaryMap).sort((a, b) => b.total - a.total);

    // Calculate term-to-date running totals (all confirmed collections ever)
    const termToDateRes = await FeeCollectionSubmission.aggregate([
      { $match: { status: { $in: ['confirmed', 'resolved'] } } },
      {
        $group: {
          _id: null,
          feedingTotal: { $sum: '$totals.feedingTotal' },
          busFareTotal: { $sum: '$totals.busFareTotal' },
          grandTotal: { $sum: '$totals.grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    const termToDate = termToDateRes[0] || { feedingTotal: 0, busFareTotal: 0, grandTotal: 0, count: 0 };

    res.json({
      success: true,
      data: {
        totals: {
          feedingTotal: totalFeedingCollected,
          busFareTotal: totalBusFareCollected,
          grandTotal: totalFeedingCollected + totalBusFareCollected,
        },
        dailySummary,
        classSummaries,
        termToDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/structures (Fee Structures Admin)
const getDailyFeeStructures = async (req, res, next) => {
  try {
    const structures = await DailyFeeStructure.find()
      .populate('class', 'name')
      .populate('level', 'name')
      .populate('lastUpdatedBy', 'email')
      .sort({ effectiveStartDate: -1 });

    res.json({ success: true, data: structures });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register/structures (Create Fee Structure Admin)
const createDailyFeeStructure = async (req, res, next) => {
  try {
    const { class: classId, level, feedingFeeAmount, busFareAmount, effectiveStartDate } = req.body;

    const structure = await DailyFeeStructure.create({
      class: classId || null,
      level: level || null,
      feedingFeeAmount,
      busFareAmount,
      effectiveStartDate: effectiveStartDate ? normalizeDate(effectiveStartDate) : new Date(),
      lastUpdatedBy: req.user.id,
    });

    const populated = await DailyFeeStructure.findById(structure._id)
      .populate('class', 'name')
      .populate('level', 'name')
      .populate('lastUpdatedBy', 'email');

    logger.info(`Daily fee structure configured. Feeding: ${feedingFeeAmount} GHS, Bus: ${busFareAmount} GHS`);
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/stats/today (Accountant dashboard header cards)
const getAccountantDashboardStats = async (req, res, next) => {
  try {
    const todayStart = normalizeDate(new Date());
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [pendingCount, confirmedToday, openDiscrepancyCount] = await Promise.all([
      FeeCollectionSubmission.countDocuments({ status: 'pending' }),
      FeeCollectionSubmission.find({
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['confirmed', 'resolved'] },
      }),
      FeeCollectionSubmission.countDocuments({ status: 'discrepancy_flagged' }),
    ]);

    let todayFeedingTotal = 0;
    let todayBusFareTotal = 0;
    confirmedToday.forEach((sub) => {
      todayFeedingTotal += sub.totals.feedingTotal;
      todayBusFareTotal += sub.totals.busFareTotal;
    });

    res.json({
      success: true,
      data: {
        pendingCount,
        openDiscrepancyCount,
        todayConfirmed: {
          feedingTotal: todayFeedingTotal,
          busFareTotal: todayBusFareTotal,
          grandTotal: todayFeedingTotal + todayBusFareTotal,
          submissionsCount: confirmedToday.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/discrepancies (Dedicated discrepancy list for accountant)
const getDiscrepancies = async (req, res, next) => {
  try {
    const { status } = req.query; // 'open', 'resolved', or omit for all

    const statusFilter =
      status === 'open'
        ? { status: 'discrepancy_flagged' }
        : status === 'resolved'
        ? { status: 'resolved' }
        : { status: { $in: ['discrepancy_flagged', 'resolved'] } };

    const submissions = await FeeCollectionSubmission.find(statusFilter)
      .populate('class', 'name')
      .populate('submittingTeacher', 'email')
      .populate('confirmedBy', 'email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyRegister,
  submitDailyRegister,
  createCorrection,
  getSubmissions,
  getSubmissionDetail,
  confirmSubmission,
  resolveDiscrepancy,
  getCollectionReports,
  getDailyFeeStructures,
  createDailyFeeStructure,
  getAccountantDashboardStats,
  getDiscrepancies,
};
