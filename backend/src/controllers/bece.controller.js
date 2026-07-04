/**
 * bece.controller.js
 *
 * Manages JHS 3 BECE candidate tracking:
 *  - List all JHS 3 students with their registration status
 *  - Register a student as a candidate
 *  - Update candidate details (index number, status, mock results)
 *  - Get BECE aggregate for a student
 */

const BeceCandidate = require('../models/BeceCandidate');
const Student = require('../models/Student');
const Class = require('../models/Class');
const ClassLevel = require('../models/ClassLevel');
const { calculateBeceAggregate } = require('../services/grading.service');
const { logAction } = require('../middleware/audit');

// ─── GET /api/bece-candidates ───────────────────────────────────────────────
// List all JHS 3 students with their candidate registration status
const listCandidates = async (req, res, next) => {
  try {
    const { academicYear } = req.query;

    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'academicYear query param is required' });
    }

    // Find JHS 3 level (levelCode 'BS9' per seed)
    const jhs3Level = await ClassLevel.findOne({ levelCode: 'BS9' });

    // Find all JHS 3 classes — field on Class model is `level`, not `classLevel`
    const jhs3Classes = jhs3Level
      ? await Class.find({ level: jhs3Level._id }).select('_id name')
      : [];

    const classIds = jhs3Classes.map((c) => c._id);

    // Find all active students in JHS 3 classes
    const students = await Student.find({
      currentClass: { $in: classIds },
      status: 'active',
    })
      .populate('currentClass', 'name')
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName otherNames admissionNumber currentClass');

    // Fetch existing candidate records for the year
    const candidateRecords = await BeceCandidate.find({
      student: { $in: students.map((s) => s._id) },
      academicYear,
    });

    const candidateMap = {};
    candidateRecords.forEach((c) => {
      candidateMap[c.student.toString()] = c;
    });

    // Merge
    const data = students.map((student) => ({
      student,
      candidate: candidateMap[student._id.toString()] || null,
    }));

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/bece-candidates/:studentId ───────────────────────────────────
// Register a student as a BECE candidate
const registerCandidate = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, indexNumber, notes } = req.body;

    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'academicYear is required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const candidate = await BeceCandidate.findOneAndUpdate(
      { student: studentId, academicYear },
      {
        registrationStatus: 'registered',
        indexNumber: indexNumber || '',
        notes: notes || '',
      },
      { new: true, upsert: true, runValidators: true }
    );

    await logAction(req, 'REGISTER_BECE_CANDIDATE', 'BeceCandidate', candidate._id, null, candidate.toObject());

    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/bece-candidates/:candidateId ────────────────────────────────
// Update candidate details: index number, status, mock results
const updateCandidate = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { registrationStatus, indexNumber, notes, mockResult } = req.body;

    const candidate = await BeceCandidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate record not found' });
    }

    const before = candidate.toObject();

    if (registrationStatus) candidate.registrationStatus = registrationStatus;
    if (indexNumber !== undefined) candidate.indexNumber = indexNumber;
    if (notes !== undefined) candidate.notes = notes;

    // Append a new mock result if provided
    if (mockResult && mockResult.examName && mockResult.aggregate !== undefined) {
      candidate.mockResults.push({
        examName: mockResult.examName,
        aggregate: Number(mockResult.aggregate),
        date: mockResult.date ? new Date(mockResult.date) : new Date(),
      });
    }

    await candidate.save();
    await logAction(req, 'UPDATE_BECE_CANDIDATE', 'BeceCandidate', candidate._id, before, candidate.toObject());

    res.json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/bece-candidates/:candidateId/mock/:index ───────────────────
// Remove a specific mock result by array index
const removeMockResult = async (req, res, next) => {
  try {
    const { candidateId, index } = req.params;
    const idx = parseInt(index, 10);

    const candidate = await BeceCandidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate record not found' });
    }

    if (idx < 0 || idx >= candidate.mockResults.length) {
      return res.status(400).json({ success: false, message: 'Invalid mock result index' });
    }

    const before = candidate.toObject();
    candidate.mockResults.splice(idx, 1);
    await candidate.save();
    await logAction(req, 'REMOVE_BECE_MOCK_RESULT', 'BeceCandidate', candidate._id, before, candidate.toObject());

    res.json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/bece-candidates/student/:studentId/aggregate ──────────────────
// Get computed BECE aggregate for a student
const getAggregate = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academicYear and term are required' });
    }

    const result = await calculateBeceAggregate(studentId, academicYear, term);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCandidates,
  registerCandidate,
  updateCandidate,
  removeMockResult,
  getAggregate,
};
