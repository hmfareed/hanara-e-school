const express = require('express');
const router = express.Router();
const {
  getStoreItems,
  createStoreItem,
  updateStoreItem,
  recordStoreSale,
  getStoreSales,
  getStoreReceiptPdf,
} = require('../controllers/store.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/items', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant', 'teacher'), getStoreItems);
router.post('/items', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), createStoreItem);
router.patch('/items/:id', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), updateStoreItem);
router.post('/sales', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), recordStoreSale);
router.get('/sales', protect, authorize('superadmin', 'admin', 'system_admin', 'accountant'), getStoreSales);
router.get('/sales/:id/receipt/pdf', protect, getStoreReceiptPdf);

module.exports = router;
