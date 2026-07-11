const express = require('express');
const router = express.Router();
const {
  getGuardianById,
  createGuardian,
  updateGuardian,
  getGuardianStudents,
} = require('../controllers/guardian.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { guardianSchema } = require('../validators/student.validators');

router.get('/:id', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getGuardianById);
router.post('/', protect, authorize('superadmin', 'admin'), validate(guardianSchema), createGuardian);
router.patch('/:id', protect, authorize('superadmin', 'admin'), validate(guardianSchema.partial()), updateGuardian);
router.get('/:id/students', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin', 'accountant'), getGuardianStudents);

module.exports = router;
