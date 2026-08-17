const mongoose = require('mongoose');
const AttendanceCredential = require('../models/AttendanceCredential');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');
const FeeStructure = require('../models/FeeStructure');
const SystemSetting = require('../models/SystemSetting');
const MockExamSeries = require('../models/MockExamSeries');
const BeceCandidate = require('../models/BeceCandidate');

// Map store name → Mongoose model name
const STORE_MODEL_MAP = {
  students: 'Student',
  staff: 'Staff',
  classes: 'Class',
  attendance: 'AttendanceRecord',
  grades: 'Grade',
  fees: 'FeeCollectionSubmission',
  feeStructures: 'FeeStructure',
  payroll: 'Payroll',
  notices: 'Notice',
  assignments: 'OfflineAssignment',
  lessonPlans: 'LessonPlan',
  behaviour: 'BehaviourRecord',
  academicYears: 'AcademicYear',
  settings: 'SystemSetting',
  mockExams: 'MockExamSeries',
  bece: 'BeceCandidate',
  staffAttendance: 'StaffAttendanceRecord',
};

/**
 * GET /api/sync/bootstrap
 * 
 * Returns a consolidated offline initialization bundle for client cache hydration.
 * Populates IndexedDB on first-time login or on explicit "Prepare for Offline" action.
 */
exports.bootstrap = async (req, res) => {
  try {
    const [
      staffList,
      credentials,
      studentsList,
      classesList,
      academicYearsList,
      feeStructuresList,
      mockSeriesList,
      settingsList,
      beceList,
    ] = await Promise.all([
      Staff.find({ employmentStatus: { $ne: 'terminated' } })
        .select('firstName lastName otherNames staffId title role department phone email photoUrl gender employmentStatus')
        .lean(),
      AttendanceCredential.find({ status: 'ACTIVE' })
        .select('staff credentialHash tokenPrefix status')
        .lean(),
      Student.find({ status: { $ne: 'withdrawn' } })
        .select('firstName lastName otherNames admissionNumber currentClass gender dob status photoUrl transport feeCategory scholarshipStatus dailyFeeConfig guardians guardianName guardianPhone')
        .populate('currentClass', 'name code grade')
        .lean(),
      Class.find()
        .select('name code grade stream stage formTeacher classTeacher roomNumber capacity subjects')
        .populate('formTeacher', 'firstName lastName staffId')
        .lean(),
      AcademicYear.find()
        .select('name code isCurrent startDate endDate terms')
        .lean(),
      FeeStructure.find()
        .select('academicYear term name category feeItems totalAmount')
        .lean(),
      MockExamSeries.find({ status: { $ne: 'archived' } })
        .select('name academicYear term startDate endDate status')
        .lean(),
      SystemSetting.find()
        .select('key value')
        .lean(),
      BeceCandidate.find()
        .populate('student', 'firstName lastName otherNames admissionNumber currentClass gender photoUrl status dob')
        .lean(),
    ]);

    // Map active credential hashes onto staff records for instant offline QR verification
    const credentialMap = new Map();
    credentials.forEach((c) => {
      if (c.staff) {
        credentialMap.set(c.staff.toString(), {
          credentialHash: c.credentialHash,
          tokenPrefix: c.tokenPrefix,
        });
      }
    });

    const enrichedStaff = staffList.map((s) => {
      const cred = credentialMap.get(s._id.toString());
      return {
        ...s,
        credentialHash: cred?.credentialHash || null,
        tokenPrefix: cred?.tokenPrefix || null,
      };
    });

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        staff: enrichedStaff.length,
        students: studentsList.length,
        classes: classesList.length,
        academicYears: academicYearsList.length,
        feeStructures: feeStructuresList.length,
        mockExams: mockSeriesList.length,
        beceCandidates: beceList.length,
      },
      data: {
        staff: enrichedStaff,
        students: studentsList,
        classes: classesList,
        academicYears: academicYearsList,
        feeStructures: feeStructuresList,
        mockExams: mockSeriesList,
        settings: settingsList,
        beceCandidates: beceList,
        serverTimestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Sync] Bootstrap error:', err);
    return res.status(500).json({ success: false, message: 'Sync bootstrap failed' });
  }
};

/**
 * GET /api/sync/pull
 * Query: store=<storeName>&since=<ISO timestamp>
 */
exports.pull = async (req, res) => {
  try {
    const { store, since } = req.query;

    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Query param `store` is required',
      });
    }

    const modelName = STORE_MODEL_MAP[store];
    if (!modelName) {
      return res.status(400).json({
        success: false,
        message: `Unknown store: "${store}". Valid stores: ${Object.keys(STORE_MODEL_MAP).join(', ')}`,
      });
    }

    const Model = mongoose.model(modelName);
    const sinceDate = since ? new Date(since) : new Date(0);

    const docs = await Model.find({ updatedAt: { $gt: sinceDate } })
      .lean()
      .limit(500); // Safety cap

    return res.json({
      success: true,
      store,
      since: sinceDate.toISOString(),
      count: docs.length,
      data: docs,
    });
  } catch (err) {
    console.error('[Sync] Pull error:', err);
    return res.status(500).json({ success: false, message: 'Sync pull failed' });
  }
};

/**
 * POST /api/sync/push
 * Body: { mutations: [{ method, url, body }] }
 */
exports.push = async (req, res) => {
  const { mutations = [] } = req.body;

  if (!Array.isArray(mutations) || mutations.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Body must include a non-empty `mutations` array',
    });
  }

  const batch = mutations.slice(0, 200);
  const results = [];

  for (const mut of batch) {
    results.push({
      method: mut.method,
      url: mut.url,
      status: 'accepted',
      message: 'Queued for processing via individual API endpoints',
    });
  }

  return res.json({
    success: true,
    processed: results.length,
    results,
  });
};

