const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createLessonPlan,
  getLessonPlans,
  duplicateLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
} = require('../controllers/lessonPlan.controller');

router.post('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), createLessonPlan);
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getLessonPlans);
router.post('/:id/duplicate', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), duplicateLessonPlan);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), updateLessonPlan);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), deleteLessonPlan);

module.exports = router;
