const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  requireSubjectAssignment,
  requireFormTeacher,
} = require('../middleware/assignmentAuth');
const {
  enterGrade,
  updateConduct,
  updateAttendance,
  updatePromotion,
  getReportCard,
  getClassGrades,
} = require('../controllers/grade.controller');

// POST /api/grades - enter grade, protected by requireSubjectAssignment
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), requireSubjectAssignment, enterGrade);

// PATCH /api/grades/conduct - update conduct, protected by requireFormTeacher
router.patch('/conduct', protect, authorize('superadmin', 'admin', 'teacher'), requireFormTeacher, updateConduct);

// PATCH /api/grades/attendance - update attendance, protected by requireFormTeacher
router.patch('/attendance', protect, authorize('superadmin', 'admin', 'teacher'), requireFormTeacher, updateAttendance);

// PATCH /api/grades/promotion - update promotion, protected by requireFormTeacher
router.patch('/promotion', protect, authorize('superadmin', 'admin', 'teacher'), requireFormTeacher, updatePromotion);

// GET /api/grades/student/:studentId/report-card - generate report card
router.get('/student/:studentId/report-card', protect, authorize('superadmin', 'admin', 'teacher'), getReportCard);

// GET /api/grades/class/:classId/subject/:subjectId - get class grades, protected by requireSubjectAssignment
router.get('/class/:classId/subject/:subjectId', protect, authorize('superadmin', 'admin', 'teacher'), requireSubjectAssignment, getClassGrades);

module.exports = router;
