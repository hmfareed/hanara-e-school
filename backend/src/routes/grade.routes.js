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
  finalizeClassTerm,
  getReportCardPdf,
} = require('../controllers/grade.controller');

// POST /api/grades - enter grade, protected by requireSubjectAssignment
router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireSubjectAssignment, enterGrade);

// PATCH /api/grades/conduct - update conduct, protected by requireFormTeacher
router.patch('/conduct', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacher, updateConduct);

// PATCH /api/grades/attendance - update attendance, protected by requireFormTeacher
router.patch('/attendance', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacher, updateAttendance);

// PATCH /api/grades/promotion - update promotion, protected by requireFormTeacher
router.patch('/promotion', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireFormTeacher, updatePromotion);

// GET /api/grades/student/:studentId/report-card - get report card data (JSON)
router.get('/student/:studentId/report-card', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getReportCard);

// GET /api/grades/student/:studentId/report-card/pdf - download report card as PDF
router.get('/student/:studentId/report-card/pdf', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getReportCardPdf);

// GET /api/grades/class/:classId/subject/:subjectId - get class grades, protected by requireSubjectAssignment
router.get('/class/:classId/subject/:subjectId', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), requireSubjectAssignment, getClassGrades);

// POST /api/grades/class/:classId/finalize - finalize term & compute class rankings
router.post('/class/:classId/finalize', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), finalizeClassTerm);

module.exports = router;
