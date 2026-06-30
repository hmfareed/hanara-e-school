const express = require('express');
const router = express.Router();
const {
  getParentDashboard,
  getParentChildren,
  getChildAttendance,
  getChildInvoices,
  getChildPayments,
} = require('../controllers/parent.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Enforce that user is authenticated and is a parent
router.use(protect);
router.use(authorize('parent'));

router.get('/dashboard', getParentDashboard);
router.get('/children', getParentChildren);
router.get('/children/:id/attendance', getChildAttendance);
router.get('/children/:id/invoices', getChildInvoices);
router.get('/children/:id/payments', getChildPayments);

module.exports = router;
