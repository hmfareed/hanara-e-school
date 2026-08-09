const express = require('express');
const router = express.Router();
const {
  getDailyRegister,
  submitDailyRegister,
  createCorrection,
  getSubmissions,
  getSubmissionDetail,
  confirmSubmission,
  resolveDiscrepancy,
  getCollectionReports,
  getDailyFeeStructures,
  createDailyFeeStructure,
  getAccountantDashboardStats,
  getDiscrepancies,
} = require('../controllers/dailyFeeCollection.controller');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { requireFormTeacherForClass } = require('../middleware/assignmentAuth');
const { validate } = require('../middleware/validate');

const {
  createDailyFeeStructureSchema,
  submitDailyRegisterSchema,
  createCorrectionSchema,
  confirmSubmissionSchema,
} = require('../validators/dailyFee.validator');

// ─── Daily Fee Configuration (Admin & Accountant) ───────────────────────────
router.get('/structures', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getDailyFeeStructures);
router.post('/structures', protect, authorize('superadmin', 'admin', 'system_admin'), validate(createDailyFeeStructureSchema), createDailyFeeStructure);

// ─── Accountant Reports (Accountant & Admin) ──────────────────────────────────
router.get('/reports', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getCollectionReports);

// ─── Accountant Dashboard Stats (today's summary cards) ──────────────────────
router.get('/stats/today', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getAccountantDashboardStats);

// ─── Discrepancies List ────────────────────────────────────────────────────────
router.get('/discrepancies', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getDiscrepancies);

// ─── Submissions Queue & Confirmation Workflow (Accountant & Admin) ─────────────
router.get('/submissions', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant', 'teacher'), getSubmissions);
router.get('/submissions/:id', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant', 'teacher'), getSubmissionDetail);
router.post('/submissions/:id/confirm', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), validate(confirmSubmissionSchema), confirmSubmission);
router.post('/submissions/:id/resolve', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), resolveDiscrepancy);

// ─── Teacher Daily Fee Register Form (Form Teacher / Class Teacher) ────────────
// Accountant / Admin / Superadmin can also GET to view registers, so they bypass requireFormTeacherForClass
const getRegisterMiddlewares = [
  protect,
  authorize('superadmin', 'admin', 'system_admin', 'accountant', 'teacher'),
  (req, res, next) => {
    // If Admin/Accountant, skip form teacher check
    if (['superadmin', 'admin', 'system_admin', 'accountant'].includes(req.user.role)) {
      return next();
    }
    // Else, enforce teacher check
    return requireFormTeacherForClass(req, res, next);
  },
  getDailyRegister
];

router.get('/', ...getRegisterMiddlewares);

router.post('/', protect, authorize('superadmin', 'admin', 'system_admin', 'teacher'), requireFormTeacherForClass, validate(submitDailyRegisterSchema), submitDailyRegister);

// Corrections on submission (Form Teacher / Class Teacher)
router.post('/:id/corrections', protect, authorize('superadmin', 'admin', 'system_admin', 'teacher'), requireFormTeacherForClass, validate(createCorrectionSchema), createCorrection);

module.exports = router;
