const express = require('express');
const router = express.Router();
const {
  getStudents,
  createStudent,
  createStudentsBulk,
  getStudentById,
  updateStudent,
  withdrawStudent,
  promoteStudent,
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createStudentSchema, updateStudentSchema } = require('../validators/student.validators');

router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getStudents);
router.post('/', protect, authorize('superadmin', 'admin'), validate(createStudentSchema), createStudent);
router.post('/bulk', protect, authorize('superadmin', 'admin'), createStudentsBulk);
router.get('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getStudentById);
router.patch('/:id', protect, authorize('superadmin', 'admin'), validate(updateStudentSchema), updateStudent);
router.post('/:id/withdraw', protect, authorize('superadmin', 'admin'), withdrawStudent);
router.post('/:id/promote', protect, authorize('superadmin', 'admin'), promoteStudent);

module.exports = router;
