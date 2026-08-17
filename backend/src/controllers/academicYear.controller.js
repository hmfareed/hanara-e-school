const AcademicYear = require('../models/AcademicYear');
const MockExamSeries = require('../models/MockExamSeries');
const MockSubjectEntry = require('../models/MockSubjectEntry');
const MockExamResult = require('../models/MockExamResult');
const MockAggregate = require('../models/MockAggregate');
const Grade = require('../models/Grade');
const StudentReport = require('../models/StudentReport');
const LessonPlan = require('../models/LessonPlan');
const OfflineAssignment = require('../models/OfflineAssignment');
const LearningResource = require('../models/LearningResource');
const BehaviourRecord = require('../models/BehaviourRecord');
const BeceCandidate = require('../models/BeceCandidate');
const SubjectAssignment = require('../models/SubjectAssignment');
const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const AttendanceRecord = require('../models/AttendanceRecord');
const DailyFeeRegister = require('../models/DailyFeeRegister');
const FeeStructure = require('../models/FeeStructure');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// GET /api/academic-years
const listAcademicYears = async (req, res, next) => {
  try {
    const years = await AcademicYear.find().sort({ createdAt: -1 });
    res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic-years/:id
const getAcademicYearById = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    res.json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// POST /api/academic-years
const createAcademicYear = async (req, res, next) => {
  try {
    const { name, terms, isCurrent } = req.body;
    const year = await AcademicYear.create({ name, terms, isCurrent: isCurrent || false });
    logger.info(`Academic year created: ${year.name}`);
    res.status(201).json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/academic-years/:id
const updateAcademicYear = async (req, res, next) => {
  try {
    const { name, terms } = req.body;
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    if (name !== undefined) year.name = name;
    if (terms !== undefined) year.terms = terms;
    await year.save();
    logger.info(`Academic year updated: ${year.name}`);
    res.json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/academic-years/:id/set-current
const setCurrentYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    year.isCurrent = true;
    await year.save(); // pre-save hook clears isCurrent on all others
    logger.info(`Current academic year set to: ${year.name}`);
    res.json({ success: true, data: year, message: `${year.name} is now the current academic year` });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/academic-years/:id
const deleteAcademicYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    const yearId = year._id;
    const yearIdStr = year._id.toString();
    const yearName = year.name;
    const wasCurrent = year.isCurrent;

    const matchQuery = {
      $or: [
        { academicYear: yearId },
        { academicYear: yearIdStr },
        { academicYear: yearName },
      ],
    };

    // 1. Mock Exams Pipeline (Series, Subject Entries, Results, Aggregates)
    const mockSeries = await MockExamSeries.find(matchQuery);
    const seriesIds = mockSeries.map((s) => s._id);

    if (seriesIds.length > 0) {
      await MockAggregate.deleteMany({ seriesId: { $in: seriesIds } });
      await MockExamResult.deleteMany({ seriesId: { $in: seriesIds } });
      await MockSubjectEntry.deleteMany({ seriesId: { $in: seriesIds } });
    }
    await MockExamSeries.deleteMany(matchQuery);

    // 2. Grades, Reports, Assignments, Resources, Behaviour, BECE
    await Grade.deleteMany(matchQuery);
    await StudentReport.deleteMany(matchQuery);
    await LessonPlan.deleteMany(matchQuery);
    await OfflineAssignment.deleteMany(matchQuery);
    await LearningResource.deleteMany(matchQuery);
    await BehaviourRecord.deleteMany(matchQuery);
    await BeceCandidate.deleteMany(matchQuery);

    // 3. Classes, Attendance, Timetables & Daily Registers
    const classes = await Class.find(matchQuery);
    const classIds = classes.map((c) => c._id);

    if (classIds.length > 0) {
      await AttendanceRecord.deleteMany({ class: { $in: classIds } });
      await DailyFeeRegister.deleteMany({ class: { $in: classIds } });
      await SubjectAssignment.deleteMany({ class: { $in: classIds } });
      await ClassSubjectAssignment.deleteMany({ class: { $in: classIds } });
      await Timetable.deleteMany({ class: { $in: classIds } });
    }

    if (year.terms && year.terms.length > 0) {
      const termIds = year.terms.map((t) => t._id).filter(Boolean);
      if (termIds.length > 0) {
        await AttendanceRecord.deleteMany({ term: { $in: termIds } });
      }
    }

    await SubjectAssignment.deleteMany(matchQuery);
    await ClassSubjectAssignment.deleteMany(matchQuery);
    await Timetable.deleteMany(matchQuery);
    await Class.deleteMany(matchQuery);

    // 4. Fee Structures, Invoices & Payments
    await FeeStructure.deleteMany(matchQuery);
    const invoices = await Invoice.find(matchQuery);
    const invoiceIds = invoices.map((i) => i._id);

    if (invoiceIds.length > 0) {
      await Payment.deleteMany({ invoice: { $in: invoiceIds } });
    }
    await Invoice.deleteMany(matchQuery);

    // 5. Delete the AcademicYear record & auto-promote another if it was current
    await year.deleteOne();

    if (wasCurrent) {
      const remainingYear = await AcademicYear.findOne().sort({ createdAt: -1 });
      if (remainingYear) {
        remainingYear.isCurrent = true;
        await remainingYear.save();
        logger.info(`Promoted academic year "${remainingYear.name}" to active current year.`);
      }
    }

    logger.info(`Academic year "${yearName}" and all related data purged successfully.`);
    res.json({
      success: true,
      message: `Academic year "${yearName}" and all associated data deleted successfully across all portals.`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic-years/rollover/preview
const getRolloverPreview = async (req, res, next) => {
  try {
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    const ClassLevel = require('../models/ClassLevel');
    const AcademicYear = require('../models/AcademicYear');

    const { fromYearId, toYearId } = req.query;

    // 1. Identify source academic year (defaults to current active year)
    let fromYear;
    if (fromYearId) {
      fromYear = await AcademicYear.findById(fromYearId);
    } else {
      fromYear = await AcademicYear.findOne({ isCurrent: true });
    }

    if (!fromYear) {
      return res.status(404).json({ success: false, message: 'Source academic year not found.' });
    }

    // 2. Identify target upcoming academic year
    let toYear = null;
    if (toYearId) {
      toYear = await AcademicYear.findById(toYearId);
    } else {
      // Find the next upcoming or newest created year
      toYear = await AcademicYear.findOne({ _id: { $ne: fromYear._id } }).sort({ startDate: -1 });
    }

    // 3. Load all class levels in chronological order
    const allLevels = await ClassLevel.find().sort({ order: 1 });
    const levelOrderMap = new Map();
    allLevels.forEach((lvl) => levelOrderMap.set(lvl.order, lvl));
    const maxOrder = Math.max(...allLevels.map((l) => l.order || 0), 13);

    // 4. Load classes for fromYear and toYear
    const fromClasses = await Class.find({ academicYear: fromYear._id }).populate('level');
    const toClasses = toYear
      ? await Class.find({ academicYear: toYear._id }).populate('level')
      : [];

    // Helper to find default target class in toYear for a given next level order
    const findTargetClass = (nextLevelOrder, originalClassName) => {
      if (!toYear || nextLevelOrder > maxOrder) return null;
      const targetLevel = levelOrderMap.get(nextLevelOrder);
      if (!targetLevel) return null;

      // Find matching class in toYear
      const levelMatches = toClasses.filter(
        (c) => c.level && c.level._id.toString() === targetLevel._id.toString()
      );
      if (levelMatches.length === 0) return null;

      // Try exact name match (e.g. Primary 2A -> Primary 3A)
      const streamLetter = originalClassName.slice(-1);
      const exactStream = levelMatches.find((c) => c.name.endsWith(streamLetter));
      return exactStream ? exactStream : levelMatches[0];
    };

    // 5. Build class preview breakdown
    const classesSummary = [];
    let totalEligibleStudents = 0;
    let totalGraduating = 0;
    let totalPromoting = 0;

    for (const cls of fromClasses) {
      const students = await Student.find({
        currentClass: cls._id,
        status: 'active',
      }).select('admissionNumber firstName lastName otherNames gender photoUrl');

      const currentOrder = cls.level ? cls.level.order : 1;
      const isGraduatingLevel = currentOrder >= maxOrder; // JHS 3 / Highest Level
      const defaultAction = isGraduatingLevel ? 'graduated' : 'promoted';

      const suggestedTarget = isGraduatingLevel
        ? null
        : findTargetClass(currentOrder + 1, cls.name);

      if (isGraduatingLevel) {
        totalGraduating += students.length;
      } else {
        totalPromoting += students.length;
      }
      totalEligibleStudents += students.length;

      classesSummary.push({
        fromClass: {
          _id: cls._id,
          name: cls.name,
          level: cls.level,
        },
        studentCount: students.length,
        isGraduatingLevel,
        suggestedAction: defaultAction,
        suggestedTargetClass: suggestedTarget
          ? { _id: suggestedTarget._id, name: suggestedTarget.name, level: suggestedTarget.level }
          : null,
        students: students.map((s) => ({
          _id: s._id,
          admissionNumber: s.admissionNumber,
          fullName: [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(' '),
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender,
          photoUrl: s.photoUrl,
          suggestedAction: defaultAction,
          suggestedTargetClassId: suggestedTarget ? suggestedTarget._id : null,
        })),
      });
    }

    res.json({
      success: true,
      data: {
        fromYear: {
          _id: fromYear._id,
          name: fromYear.name,
          isCurrent: fromYear.isCurrent,
        },
        toYear: toYear
          ? {
              _id: toYear._id,
              name: toYear.name,
              isCurrent: toYear.isCurrent,
            }
          : null,
        stats: {
          totalEligibleStudents,
          totalPromoting,
          totalGraduating,
          classesCount: fromClasses.length,
        },
        classesSummary,
        availableToClasses: toClasses.map((c) => ({
          _id: c._id,
          name: c.name,
          level: c.level,
        })),
        allLevels,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/academic-years/rollover/execute
const executeRollover = async (req, res, next) => {
  try {
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    const AcademicYear = require('../models/AcademicYear');
    const PromotionLog = require('../models/PromotionLog');

    const {
      fromYearId,
      toYearId,
      makeToYearCurrent = true,
      classMappings = [],     // [{ fromClassId, targetClassId, action }]
      studentOverrides = [],  // [{ studentId, action, targetClassId, remarks }]
    } = req.body;

    if (!fromYearId || !toYearId) {
      return res.status(400).json({
        success: false,
        message: 'Both fromYearId and toYearId are required for academic year rollover.',
      });
    }

    const fromYear = await AcademicYear.findById(fromYearId);
    const toYear = await AcademicYear.findById(toYearId);

    if (!fromYear || !toYear) {
      return res.status(404).json({
        success: false,
        message: 'Specified source or target academic year does not exist.',
      });
    }

    // Build lookup maps for overrides
    const studentOverrideMap = new Map();
    studentOverrides.forEach((o) => studentOverrideMap.set(o.studentId.toString(), o));

    const classMappingMap = new Map();
    classMappings.forEach((m) => classMappingMap.set(m.fromClassId.toString(), m));

    // Get all fromClasses
    const fromClasses = await Class.find({ academicYear: fromYear._id }).populate('level');
    let totalProcessed = 0;
    let promotedCount = 0;
    let repeatedCount = 0;
    let graduatedCount = 0;
    let withdrawnCount = 0;

    const promotionLogsToInsert = [];

    for (const cls of fromClasses) {
      const classMapping = classMappingMap.get(cls._id.toString());
      const students = await Student.find({ currentClass: cls._id, status: 'active' });

      for (const student of students) {
        const override = studentOverrideMap.get(student._id.toString());

        // Determine final action and target class
        let action = override?.action || classMapping?.action || (cls.level?.order >= 13 ? 'graduated' : 'promoted');
        let targetClassId = override?.targetClassId || classMapping?.targetClassId || null;
        const remarks = override?.remarks || '';

        if (action === 'promoted' && targetClassId) {
          student.currentClass = targetClassId;
          student.status = 'active';
          promotedCount++;
        } else if (action === 'repeated') {
          // If repeat target specified in toYear, assign; otherwise keep in same class
          if (targetClassId) {
            student.currentClass = targetClassId;
          }
          student.status = 'active';
          repeatedCount++;
        } else if (action === 'graduated') {
          student.status = 'graduated';
          student.currentClass = null;
          graduatedCount++;
        } else if (action === 'withdrawn') {
          student.status = 'withdrawn';
          withdrawnCount++;
        }

        await student.save();

        promotionLogsToInsert.push({
          student: student._id,
          fromClass: cls._id,
          toClass: targetClassId || null,
          fromAcademicYear: fromYear._id,
          toAcademicYear: toYear._id,
          action,
          remarks,
          performedBy: req.user?._id || null,
        });

        totalProcessed++;
      }
    }

    if (promotionLogsToInsert.length > 0) {
      await PromotionLog.insertMany(promotionLogsToInsert);
    }

    // Update academic years if requested
    if (makeToYearCurrent) {
      await AcademicYear.updateMany({}, { $set: { isCurrent: false } });
      toYear.isCurrent = true;
      await toYear.save();
    }

    logger.info(
      `Academic Year rollover executed from ${fromYear.name} to ${toYear.name}. Total processed: ${totalProcessed} (Promoted: ${promotedCount}, Repeated: ${repeatedCount}, Graduated: ${graduatedCount})`
    );

    res.json({
      success: true,
      message: `Academic year rollover completed successfully! Processed ${totalProcessed} students.`,
      data: {
        fromYear: fromYear.name,
        toYear: toYear.name,
        totalProcessed,
        promotedCount,
        repeatedCount,
        graduatedCount,
        withdrawnCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic-years/rollover/history
const getRolloverHistory = async (req, res, next) => {
  try {
    const PromotionLog = require('../models/PromotionLog');
    const { toAcademicYear, action, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (toAcademicYear) filter.toAcademicYear = toAcademicYear;
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      PromotionLog.find(filter)
        .populate('student', 'admissionNumber firstName lastName otherNames gender')
        .populate('fromClass', 'name')
        .populate('toClass', 'name')
        .populate('fromAcademicYear', 'name')
        .populate('toAcademicYear', 'name')
        .populate('performedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PromotionLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  setCurrentYear,
  deleteAcademicYear,
  getRolloverPreview,
  executeRollover,
  getRolloverHistory,
};


