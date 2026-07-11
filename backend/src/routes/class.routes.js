const express = require('express');
const router = express.Router();
const {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getClassLevels,
  assignFormTeacher,
} = require('../controllers/class.controller');
const { protect, softProtect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createClassSchema,
  createSubjectSchema,
  createAssignmentSchema,
} = require('../validators/class.validators');

router.get('/', softProtect, getClasses);
router.post('/', protect, authorize('superadmin', 'admin'), validate(createClassSchema), createClass);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateClass);
router.patch('/:id/form-teacher', protect, authorize('superadmin', 'admin'), assignFormTeacher);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteClass);

router.get('/levels', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getClassLevels);

router.get('/subjects', getSubjects);
router.post('/subjects', protect, authorize('superadmin', 'admin'), validate(createSubjectSchema), createSubject);
router.put('/subjects/:id', protect, authorize('superadmin', 'admin'), updateSubject);
router.delete('/subjects/:id', protect, authorize('superadmin', 'admin'), deleteSubject);

router.get('/assignments', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getAssignments);
router.post('/assignments', protect, authorize('superadmin', 'admin'), validate(createAssignmentSchema), createAssignment);
router.put('/assignments/:id', protect, authorize('superadmin', 'admin'), updateAssignment);
router.delete('/assignments/:id', protect, authorize('superadmin', 'admin'), deleteAssignment);

module.exports = router;
