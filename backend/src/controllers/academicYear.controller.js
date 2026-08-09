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

module.exports = {
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  setCurrentYear,
  deleteAcademicYear,
};


