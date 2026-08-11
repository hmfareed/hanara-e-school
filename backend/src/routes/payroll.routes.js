const express = require('express');
const router = express.Router();
const {
  getPayrolls,
  generateMonthlyPayroll,
  updatePayrollItem,
  approveMonthlyPayroll,
  getPayslipPdf,
  deleteMonthlyPayroll,
} = require('../controllers/payroll.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getPayrolls);
router.post('/generate', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), generateMonthlyPayroll);
router.patch('/:id', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), updatePayrollItem);
router.post('/approve', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), approveMonthlyPayroll);
router.delete('/month/:month', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), deleteMonthlyPayroll);
router.get('/payslip/:id/pdf', protect, getPayslipPdf);

module.exports = router;
