const { canGradeSubject, isFormTeacherOf } = require('../utils/authHelpers');
const AcademicYear = require('../models/AcademicYear');

const requireSubjectAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { role } = req.user;
    if (role === 'superadmin' || role === 'admin') {
      return next();
    }

    const userId = req.user.id || req.user._id;
    const classId = req.params.classId || req.query.classId || req.body.classId || req.query.class || req.body.class;
    const subjectId = req.params.subjectId || req.query.subjectId || req.body.subjectId || req.query.subject || req.body.subject;

    let academicYear = req.query.academicYear || req.body.academicYear || req.params.academicYear;
    if (!academicYear) {
      const currentYear = await AcademicYear.findOne({ isCurrent: true });
      if (currentYear) {
        academicYear = currentYear.name;
      }
    }

    if (!classId || !subjectId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'classId, subjectId, and academicYear are required to verify subject assignment',
      });
    }

    const allowed = await canGradeSubject(userId, classId, subjectId, academicYear);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to teach this subject to this class',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireFormTeacher = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { role } = req.user;
    if (role === 'superadmin' || role === 'admin') {
      return next();
    }

    const userId = req.user.id || req.user._id;
    const classId = req.params.classId || req.query.classId || req.body.classId || req.query.class || req.body.class;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'classId is required to verify form teacher status',
      });
    }

    const allowed = await isFormTeacherOf(userId, classId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not the form teacher of this class',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireSubjectAssignment,
  requireFormTeacher,
};
