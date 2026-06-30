const SubjectAssignment = require('../models/SubjectAssignment');
const logger = require('../utils/logger');

// POST /api/assignments
const createAssignment = async (req, res, next) => {
  try {
    const { teacher, class: classId, subject, academicYear, isActive } = req.body;
    if (!teacher || !classId || !subject || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'teacher, class, subject, and academicYear are required',
      });
    }

    const assignment = await SubjectAssignment.findOneAndUpdate(
      { teacher, class: classId, subject, academicYear },
      { isActive: isActive !== undefined ? isActive : true },
      { new: true, upsert: true, runValidators: true }
    );

    logger.info(`SubjectAssignment created/updated for teacher ${teacher} in class ${classId}`);
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/assignments/:id (Deactivate)
const deactivateAssignment = async (req, res, next) => {
  try {
    const assignment = await SubjectAssignment.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    logger.info(`SubjectAssignment ${req.params.id} deactivated`);
    res.json({ success: true, data: assignment, message: 'Assignment deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/assignments
const listAssignments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.teacher) filter.teacher = req.query.teacher;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const assignments = await SubjectAssignment.find(filter)
      .populate('teacher', 'email role')
      .populate('class', 'name')
      .populate('subject', 'name code');

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  deactivateAssignment,
  listAssignments,
};
