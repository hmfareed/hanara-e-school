const OfflineAssignment = require('../models/OfflineAssignment');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');

// POST /api/offline-assignments
const createAssignment = async (req, res, next) => {
  try {
    const { title, topic, classId, subjectId, dueDate, maxMarks, term } = req.body;
    const teacherId = req.user.id || req.user._id;

    if (!title || !classId || !subjectId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, Class, Subject, and Due Date are required.',
      });
    }

    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    const academicYearStr = currentYear ? currentYear.name : '2025/2026';

    // Populate default active students in this class for scoring
    const students = await Student.find({ currentClass: classId, status: 'active' }).select('_id');
    const defaultStudentScores = students.map((st) => ({
      student: st._id,
      score: 0,
      submitted: true,
      remarks: '',
    }));

    const assignment = await OfflineAssignment.create({
      title,
      topic: topic || '',
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      academicYear: academicYearStr,
      term: term || '1',
      dateGiven: new Date(),
      dueDate: new Date(dueDate),
      maxMarks: maxMarks || 10,
      studentScores: defaultStudentScores,
    });

    const populated = await OfflineAssignment.findById(assignment._id)
      .populate('class', 'name')
      .populate('subject', 'name code');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/offline-assignments
const getAssignments = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.query;
    const teacherId = req.user.id || req.user._id;

    const filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = teacherId;
    }
    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;

    const assignments = await OfflineAssignment.find(filter)
      .populate('class', 'name')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

// GET /api/offline-assignments/:id
const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await OfflineAssignment.findById(req.params.id)
      .populate('class', 'name')
      .populate('subject', 'name code')
      .populate('studentScores.student', 'firstName lastName admissionNumber photoUrl');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

// PUT /api/offline-assignments/:id/scores
const updateAssignmentScores = async (req, res, next) => {
  try {
    const { scores } = req.body; // array of { studentId, score, remarks }

    const assignment = await OfflineAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (scores && Array.isArray(scores)) {
      assignment.studentScores = scores.map((s) => ({
        student: s.studentId,
        score: Number(s.score) || 0,
        submitted: s.submitted !== undefined ? s.submitted : true,
        remarks: s.remarks || '',
      }));
    }

    await assignment.save();

    res.json({ success: true, data: assignment, message: 'Assignment scores updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/offline-assignments/:id
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await OfflineAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignmentScores,
  deleteAssignment,
};
