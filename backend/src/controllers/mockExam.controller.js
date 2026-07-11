/**
 * mockExam.controller.js
 *
 * Handles all JHS 3 Mock Exam API operations:
 *
 * Series (admin/HT):
 *   POST   /api/mock-exams/series
 *   GET    /api/mock-exams/series
 *   PATCH  /api/mock-exams/series/:id/close
 *
 * Teacher entry:
 *   GET    /api/mock-exams/:seriesId/my-entries
 *   POST   /api/mock-exams/:seriesId/entries/:entryId/scores
 *   PATCH  /api/mock-exams/:seriesId/entries/:entryId/submit
 *   PATCH  /api/mock-exams/:seriesId/entries/:entryId/reopen
 *
 * Admin/HT panel:
 *   GET    /api/mock-exams/:seriesId/matrix
 *   GET    /api/mock-exams/:seriesId/students/:studentId
 *   GET    /api/mock-exams/:seriesId/rankings
 *   GET    /api/mock-exams/:seriesId/trend/:studentId
 *
 * PDF:
 *   POST   /api/mock-exams/:seriesId/students/:studentId/slip
 *   POST   /api/mock-exams/:seriesId/classes/:classId/slips
 */

const MockExamSeries = require('../models/MockExamSeries');
const MockSubjectEntry = require('../models/MockSubjectEntry');
const MockExamResult = require('../models/MockExamResult');
const MockAggregate = require('../models/MockAggregate');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const SubjectAssignment = require('../models/SubjectAssignment');
const AuditLog = require('../models/AuditLog');
const SchoolProfile = require('../models/SchoolProfile');
const ClassLevel = require('../models/ClassLevel');
const {
  computeGradeFromScore,
  recomputeAggregate,
  recomputeRankings,
} = require('../services/mockExam.service');
const {
  generateMockSlipPdf,
  generateMockSlipZip,
} = require('../services/pdf.service');
const logger = require('../utils/logger');

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */

/** Returns true if the user can act as admin/HT for mock exam management */
function isAdminOrHT(user) {
  return (
    user.role === 'superadmin' ||
    user.role === 'admin' ||
    user.role === 'system_admin'
  );
}

/** Returns true if the user can enter scores (teacher or system_admin in teaching capacity) */
function canEnterScores(user) {
  return (
    user.role === 'teacher' ||
    user.role === 'superadmin' ||
    user.role === 'admin' ||
    user.role === 'system_admin'
  );
}

/** Resolves JHS 3 class level IDs from ClassLevel collection */
async function getJhs3LevelIds() {
  const levels = await ClassLevel.find({ category: 'JHS', levelCode: { $regex: /3$/i } });
  if (levels.length === 0) {
    // Fallback: any JHS with displayName containing "3"
    const allJhs = await ClassLevel.find({ category: 'JHS' });
    return allJhs
      .filter((l) => l.displayName.includes('3') || l.levelCode.includes('3'))
      .map((l) => l._id);
  }
  return levels.map((l) => l._id);
}

/* ─────────────────────────────────────────────────────────
   SERIES MANAGEMENT
───────────────────────────────────────────────────────── */

// POST /api/mock-exams/series
const createSeries = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorised to create mock exam series' });
    }

    const { name, academicYear, order } = req.body;
    if (!name || !academicYear || order === undefined) {
      return res.status(400).json({ success: false, message: 'name, academicYear and order are required' });
    }

    const series = await MockExamSeries.create({
      name: name.trim(),
      academicYear: academicYear.trim(),
      order: Number(order),
      status: 'open',
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: series });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/series
const listSeries = async (req, res, next) => {
  try {
    const { academicYear } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;

    const series = await MockExamSeries.find(filter)
      .populate('createdBy', 'email role')
      .sort({ order: 1 });

    res.json({ success: true, data: series });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/mock-exams/series/:id/close
const closeSeries = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorised to close mock exam series' });
    }

    const series = await MockExamSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });
    if (series.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Series is already closed' });
    }

    series.status = 'closed';
    series.closedAt = new Date();
    series.closedBy = req.user.id;
    await series.save();

    res.json({ success: true, data: series });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────
   TEACHER ENTRY
───────────────────────────────────────────────────────── */

// GET /api/mock-exams/:seriesId/my-entries
// Returns this teacher's JHS 3 class/subject assignments with their entry status
const getMyEntries = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const series = await MockExamSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    // Find JHS 3 class IDs
    const jhs3LevelIds = await getJhs3LevelIds();
    const jhs3Classes = await Class.find({ level: { $in: jhs3LevelIds } }).select('_id name');
    const jhs3ClassIds = jhs3Classes.map((c) => c._id);

    // Find this teacher's active subject assignments for JHS 3 classes
    const assignments = await SubjectAssignment.find({
      teacher: req.user.id,
      class: { $in: jhs3ClassIds },
      isActive: true,
    })
      .populate('class', 'name')
      .populate('subject', 'name code');

    // For each assignment, find or describe the MockSubjectEntry
    const entries = await Promise.all(
      assignments.map(async (sa) => {
        const entry = await MockSubjectEntry.findOne({
          seriesId,
          classId: sa.class._id,
          subjectId: sa.subject._id,
        });

        return {
          assignmentId: sa._id,
          class: sa.class,
          subject: sa.subject,
          entryId: entry?._id || null,
          status: entry?.status || 'not_started',
          studentCount: entry?.studentCount || 0,
          enteredCount: entry?.enteredCount || 0,
          submittedAt: entry?.submittedAt || null,
          isCore: entry?.isCore ?? false,
        };
      })
    );

    res.json({ success: true, data: entries, series });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/:seriesId/entries/:entryId/scores
// Returns the score grid for a specific entry (or initialises it)
const getEntryScores = async (req, res, next) => {
  try {
    const { seriesId, entryId } = req.params;

    // If entryId is "new", we need classId and subjectId from query
    if (entryId === 'new') {
      const { classId, subjectId } = req.query;
      if (!classId || !subjectId) {
        return res.status(400).json({ success: false, message: 'classId and subjectId are required' });
      }

      const series = await MockExamSeries.findById(seriesId);
      if (!series) return res.status(404).json({ success: false, message: 'Series not found' });
      if (series.status === 'closed') {
        return res.status(400).json({ success: false, message: 'This mock series is closed' });
      }

      // Determine isCore (English, Math, Science, Social Studies)
      const subject = await Subject.findById(subjectId);
      const coreNames = ['english', 'mathematics', 'science', 'social studies', 'integrated science'];
      const isCore = coreNames.some((n) => subject?.name?.toLowerCase().includes(n));

      const students = await Student.find({ currentClass: classId, status: 'active' })
        .sort({ lastName: 1, firstName: 1 })
        .select('firstName lastName otherNames admissionNumber');

      // Upsert MockSubjectEntry
      let entry = await MockSubjectEntry.findOneAndUpdate(
        { seriesId, classId, subjectId },
        {
          $setOnInsert: {
            seriesId,
            classId,
            subjectId,
            teacherId: req.user.id,
            isCore,
            status: 'draft',
            studentCount: students.length,
            enteredCount: 0,
          },
        },
        { upsert: true, new: true }
      );

      // Update studentCount in case it changed
      if (entry.studentCount !== students.length) {
        entry.studentCount = students.length;
        await entry.save();
      }

      // Load existing results
      const existingResults = await MockExamResult.find({ seriesId, subjectEntryId: entry._id });
      const resultMap = {};
      existingResults.forEach((r) => { resultMap[r.studentId.toString()] = r; });

      const rows = students.map((s) => {
        const result = resultMap[s._id.toString()];
        return {
          studentId: s._id,
          name: `${s.firstName} ${s.lastName}`,
          admissionNumber: s.admissionNumber,
          rawScore: result?.rawScore ?? null,
          grade: result?.grade ?? null,
        };
      });

      return res.json({ success: true, data: { entry, rows, subject, series } });
    }

    // Load existing entry by ID
    const entry = await MockSubjectEntry.findById(entryId)
      .populate('subjectId', 'name code')
      .populate('classId', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    const students = await Student.find({ currentClass: entry.classId._id, status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName otherNames admissionNumber');

    const existingResults = await MockExamResult.find({ seriesId, subjectEntryId: entryId });
    const resultMap = {};
    existingResults.forEach((r) => { resultMap[r.studentId.toString()] = r; });

    const rows = students.map((s) => {
      const result = resultMap[s._id.toString()];
      return {
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        rawScore: result?.rawScore ?? null,
        grade: result?.grade ?? null,
      };
    });

    res.json({ success: true, data: { entry, rows } });
  } catch (err) {
    next(err);
  }
};

// POST /api/mock-exams/:seriesId/entries/:entryId/scores
// Bulk save scores (draft). Body: { scores: [{ studentId, rawScore }] }
const saveScores = async (req, res, next) => {
  try {
    const { seriesId, entryId } = req.params;
    const { scores } = req.body; // array of { studentId, rawScore }

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ success: false, message: 'scores array is required' });
    }

    const entry = await MockSubjectEntry.findById(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (entry.seriesId.toString() !== seriesId) {
      return res.status(400).json({ success: false, message: 'Entry does not belong to this series' });
    }
    if (entry.status === 'submitted') {
      return res.status(403).json({ success: false, message: 'Entry is submitted and locked. Ask admin to reopen.' });
    }

    const series = await MockExamSeries.findById(seriesId);
    if (series?.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This mock series is closed' });
    }

    // Teacher can only save scores for their own entry
    if (
      entry.teacherId.toString() !== req.user.id &&
      !isAdminOrHT(req.user)
    ) {
      return res.status(403).json({ success: false, message: 'You are not the assigned teacher for this entry' });
    }

    const savedResults = await Promise.all(
      scores.map(async ({ studentId, rawScore }) => {
        const score = rawScore !== null && rawScore !== undefined ? Number(rawScore) : null;
        const grade = score !== null ? await computeGradeFromScore(score) : null;

        return MockExamResult.findOneAndUpdate(
          { seriesId, studentId, subjectId: entry.subjectId },
          {
            seriesId,
            subjectEntryId: entry._id,
            studentId,
            classId: entry.classId,
            subjectId: entry.subjectId,
            rawScore: score,
            grade,
            enteredBy: req.user.id,
            enteredAt: new Date(),
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      })
    );

    // Recalculate enteredCount
    const enteredCount = await MockExamResult.countDocuments({
      subjectEntryId: entry._id,
      rawScore: { $ne: null },
    });
    entry.enteredCount = enteredCount;
    await entry.save();

    // Trigger aggregate recomputation for each affected student (async, non-blocking)
    const studentIds = scores.map((s) => s.studentId).filter(Boolean);
    Promise.all(studentIds.map((sid) => recomputeAggregate(seriesId, sid))).catch((e) =>
      logger.warn('aggregate recompute warning:', e.message)
    );

    res.json({ success: true, data: { enteredCount, total: entry.studentCount, results: savedResults } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/mock-exams/:seriesId/entries/:entryId/submit
const submitEntry = async (req, res, next) => {
  try {
    const { seriesId, entryId } = req.params;

    const entry = await MockSubjectEntry.findById(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (entry.status === 'submitted') {
      return res.status(400).json({ success: false, message: 'Already submitted' });
    }

    // Teacher can only submit their own entry
    if (
      entry.teacherId.toString() !== req.user.id &&
      !isAdminOrHT(req.user)
    ) {
      return res.status(403).json({ success: false, message: 'You are not the assigned teacher for this entry' });
    }

    // Must have entered all students' scores before submitting
    if (entry.enteredCount < entry.studentCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit: ${entry.enteredCount} of ${entry.studentCount} scores entered. Enter all scores first.`,
      });
    }

    entry.status = 'submitted';
    entry.submittedAt = new Date();
    await entry.save();

    // Recompute rankings for the class
    recomputeRankings(seriesId, entry.classId.toString()).catch((e) =>
      logger.warn('ranking recompute warning:', e.message)
    );

    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/mock-exams/:seriesId/entries/:entryId/reopen
const reopenEntry = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admin or head teacher can reopen entries' });
    }

    const { seriesId, entryId } = req.params;
    const entry = await MockSubjectEntry.findById(entryId)
      .populate('subjectId', 'name')
      .populate('classId', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    const before = { status: entry.status };
    entry.status = 'reopened';
    entry.reopenedBy = req.user.id;
    entry.reopenedAt = new Date();
    await entry.save();

    // Audit log — sensitive action
    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role,
      actingAs: 'admin',
      action: 'mock_exam.reopen',
      targetType: 'MockSubjectEntry',
      targetId: entry._id,
      beforeValue: before,
      afterValue: { status: 'reopened' },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      severity: 'sensitive',
    });

    res.json({ success: true, data: entry, message: `Entry for ${entry.subjectId?.name} / ${entry.classId?.name} reopened` });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────
   ADMIN / HEAD TEACHER PANEL
───────────────────────────────────────────────────────── */

// GET /api/mock-exams/:seriesId/matrix
// Submission status matrix: subjects (rows) × classes (columns)
const getSubmissionMatrix = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { seriesId } = req.params;

    const jhs3LevelIds = await getJhs3LevelIds();
    const jhs3Classes = await Class.find({ level: { $in: jhs3LevelIds } })
      .select('name _id')
      .sort({ name: 1 });

    const subjects = await Subject.find({}).select('name code _id').sort({ name: 1 });

    const entries = await MockSubjectEntry.find({ seriesId })
      .populate('teacherId', 'email refStaff')
      .lean();

    // Build lookup: entries[classId][subjectId] = entry
    const entryMap = {};
    entries.forEach((e) => {
      const cKey = e.classId.toString();
      const sKey = e.subjectId.toString();
      if (!entryMap[cKey]) entryMap[cKey] = {};
      entryMap[cKey][sKey] = e;
    });

    // Build matrix
    const matrix = subjects.map((subject) => ({
      subject: { _id: subject._id, name: subject.name, code: subject.code },
      cells: jhs3Classes.map((cls) => {
        const entry = entryMap[cls._id.toString()]?.[subject._id.toString()];
        return {
          classId: cls._id,
          className: cls.name,
          entryId: entry?._id || null,
          status: entry?.status || 'not_started',
          teacherEmail: entry?.teacherId?.email || null,
          submittedAt: entry?.submittedAt || null,
          enteredCount: entry?.enteredCount || 0,
          studentCount: entry?.studentCount || 0,
        };
      }),
    }));

    res.json({
      success: true,
      data: { matrix, classes: jhs3Classes, subjects },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/:seriesId/students/:studentId
// Full mock result card for a student in this series
const getStudentResult = async (req, res, next) => {
  try {
    const { seriesId, studentId } = req.params;

    // Teachers can only view their own subject's data (enforced by client)
    // Admins/HT get full view
    const student = await Student.findById(studentId)
      .populate('currentClass', 'name');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const series = await MockExamSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    const results = await MockExamResult.find({ seriesId, studentId })
      .populate('subjectId', 'name code')
      .lean();

    // Enrich with isCore flag from entries
    const entryIds = [...new Set(results.map((r) => r.subjectEntryId?.toString()).filter(Boolean))];
    const entries = await MockSubjectEntry.find({ _id: { $in: entryIds } }).select('isCore status subjectId');
    const entryMap = {};
    entries.forEach((e) => { entryMap[e._id.toString()] = e; });

    const enrichedResults = results.map((r) => ({
      ...r,
      isCore: entryMap[r.subjectEntryId?.toString()]?.isCore ?? false,
      entryStatus: entryMap[r.subjectEntryId?.toString()]?.status ?? 'draft',
    }));

    const aggregate = await MockAggregate.findOne({ seriesId, studentId });

    res.json({
      success: true,
      data: { student, series, results: enrichedResults, aggregate },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/:seriesId/rankings
// Class and cohort rankings for a series; optional ?classId filter
const getRankings = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { seriesId } = req.params;
    const { classId } = req.query;

    const filter = { seriesId, isComplete: true };
    if (classId) filter.classId = classId;

    const aggregates = await MockAggregate.find(filter)
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('classId', 'name')
      .sort({ aggregate: 1 });

    res.json({ success: true, data: aggregates });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/:seriesId/classes/:classId/grades-grid
// Returns a grid representation of all student scores/grades for a class in a series
const getClassGradesGrid = async (req, res, next) => {
  try {
    const { seriesId, classId } = req.params;

    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });

    const students = await Student.find({ currentClass: classId, status: 'active' })
      .select('firstName lastName otherNames admissionNumber')
      .sort({ lastName: 1, firstName: 1 });

    const subjects = await Subject.find({ appliesToLevels: classDoc.level }).select('name code _id');

    // Get all subject entries to know which ones are submitted
    const entries = await MockSubjectEntry.find({ seriesId, classId }).select('subjectId status');
    const entryStatusMap = {};
    entries.forEach((e) => {
      entryStatusMap[e.subjectId.toString()] = e.status;
    });

    // Get all results
    const results = await MockExamResult.find({ seriesId, classId }).select('studentId subjectId grade');
    const resultMap = {}; // resultMap[studentId][subjectId] = grade
    results.forEach((r) => {
      const stuId = r.studentId.toString();
      const subId = r.subjectId.toString();
      if (!resultMap[stuId]) resultMap[stuId] = {};
      resultMap[stuId][subId] = r.grade;
    });

    // Build grid rows
    const rows = students.map((s) => {
      const studentGrades = {};
      subjects.forEach((sub) => {
        const subId = sub._id.toString();
        const status = entryStatusMap[subId];
        // Only show grade if status is 'submitted'
        if (status === 'submitted') {
          studentGrades[subId] = resultMap[s._id.toString()]?.[subId] ?? 'N/A';
        } else {
          studentGrades[subId] = 'N/A';
        }
      });

      return {
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber || '—',
        grades: studentGrades,
      };
    });

    res.json({
      success: true,
      data: {
        subjects: subjects.map((sub) => ({
          _id: sub._id,
          name: sub.name,
          code: sub.code || sub.name.substring(0, 4).toUpperCase(),
        })),
        rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/mock-exams/:seriesId/trend/:studentId
// Cross-series trend for a student
const getStudentTrend = async (req, res, next) => {
  try {
    const { seriesId, studentId } = req.params;

    // Get the academic year of the requested series
    const series = await MockExamSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    // Get all series in the same academic year, ordered
    const allSeries = await MockExamSeries.find({ academicYear: series.academicYear }).sort({ order: 1 });

    const trend = await Promise.all(
      allSeries.map(async (s) => {
        const agg = await MockAggregate.findOne({ seriesId: s._id, studentId }).lean();
        return {
          series: { _id: s._id, name: s.name, order: s.order },
          aggregate: agg?.aggregate ?? null,
          classPosition: agg?.classPosition ?? null,
          cohortPosition: agg?.cohortPosition ?? null,
          isComplete: agg?.isComplete ?? false,
        };
      })
    );

    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────
   PDF GENERATION
───────────────────────────────────────────────────────── */

// POST /api/mock-exams/:seriesId/students/:studentId/slip
const generateSingleSlip = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admin or head teacher can generate slips' });
    }

    const { seriesId, studentId } = req.params;

    const student = await Student.findById(studentId).populate('currentClass', 'name');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const series = await MockExamSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    const results = await MockExamResult.find({ seriesId, studentId })
      .populate('subjectId', 'name code')
      .lean();

    const entryIds = [...new Set(results.map((r) => r.subjectEntryId?.toString()).filter(Boolean))];
    const entries = await MockSubjectEntry.find({ _id: { $in: entryIds } }).select('isCore status');
    const entryMap = {};
    entries.forEach((e) => { entryMap[e._id.toString()] = e; });

    const enrichedResults = results
      .filter((r) => entryMap[r.subjectEntryId?.toString()]?.status === 'submitted')
      .map((r) => ({
        ...r,
        isCore: entryMap[r.subjectEntryId?.toString()]?.isCore ?? false,
      }));

    const aggregate = await MockAggregate.findOne({ seriesId, studentId });
    const schoolProfile = await SchoolProfile.findOne({});

    // Load trend data (prior series)
    const allSeries = await MockExamSeries.find({ academicYear: series.academicYear }).sort({ order: 1 });
    const trend = await Promise.all(
      allSeries.map(async (s) => {
        const agg = await MockAggregate.findOne({ seriesId: s._id, studentId }).lean();
        return { series: s, aggregate: agg };
      })
    );

    const pdfBuffer = await generateMockSlipPdf({
      student,
      series,
      results: enrichedResults,
      aggregate,
      schoolProfile,
      trend,
    });

    const safeName = `${student.admissionNumber || studentId}_${series.name.replace(/\s+/g, '_')}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MockSlip_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// POST /api/mock-exams/:seriesId/classes/:classId/slips
const generateClassSlips = async (req, res, next) => {
  try {
    if (!isAdminOrHT(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admin or head teacher can generate slips' });
    }

    const { seriesId, classId } = req.params;

    const students = await Student.find({ currentClass: classId, status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .populate('currentClass', 'name');

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No active students found in this class' });
    }

    const series = await MockExamSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

    const schoolProfile = await SchoolProfile.findOne({});
    const allSeries = await MockExamSeries.find({ academicYear: series.academicYear }).sort({ order: 1 });

    const slips = await Promise.all(
      students.map(async (student) => {
        const results = await MockExamResult.find({ seriesId, studentId: student._id })
          .populate('subjectId', 'name code')
          .lean();

        const entryIds = [...new Set(results.map((r) => r.subjectEntryId?.toString()).filter(Boolean))];
        const entries = await MockSubjectEntry.find({ _id: { $in: entryIds } }).select('isCore status');
        const entryMap = {};
        entries.forEach((e) => { entryMap[e._id.toString()] = e; });

        const enrichedResults = results
          .filter((r) => entryMap[r.subjectEntryId?.toString()]?.status === 'submitted')
          .map((r) => ({
            ...r,
            isCore: entryMap[r.subjectEntryId?.toString()]?.isCore ?? false,
          }));

        const aggregate = await MockAggregate.findOne({ seriesId, studentId: student._id });

        const trend = await Promise.all(
          allSeries.map(async (s) => {
            const agg = await MockAggregate.findOne({ seriesId: s._id, studentId: student._id }).lean();
            return { series: s, aggregate: agg };
          })
        );

        const pdfBuffer = await generateMockSlipPdf({
          student,
          series,
          results: enrichedResults,
          aggregate,
          schoolProfile,
          trend,
        });

        return {
          filename: `MockSlip_${student.admissionNumber || student._id}.pdf`,
          buffer: pdfBuffer,
        };
      })
    );

    const zipBuffer = await generateMockSlipZip(slips);
    const safeClass = students[0]?.currentClass?.name?.replace(/\s+/g, '_') || classId;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="MockSlips_${safeClass}_${series.name.replace(/\s+/g, '_')}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSeries,
  listSeries,
  closeSeries,
  getMyEntries,
  getEntryScores,
  saveScores,
  submitEntry,
  reopenEntry,
  getSubmissionMatrix,
  getStudentResult,
  getRankings,
  getStudentTrend,
  generateSingleSlip,
  generateClassSlips,
  getClassGradesGrid,
};
