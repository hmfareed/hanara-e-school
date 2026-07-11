const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const auditLogger = require('../middleware/audit');

// Apply protection and system_admin authorization to all routes in this router
router.use(protect);
router.use(authorize('system_admin'));
router.use(auditLogger);

// 1. User Management
router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.patch('/users/:id/assignments', adminController.updateAssignments);

// 2. Settings Management
router.get('/settings', adminController.listSettings);
router.patch('/settings/:key', adminController.updateSetting);

// 3. Integration Health Monitor
router.get('/integrations/status', adminController.getIntegrationStatus);
router.post('/integrations/:service/test', adminController.testConnection);
router.post('/integrations/payments/reconcile/:paymentId', adminController.reconcilePayment);

// 4. Backup & Restore
router.get('/backups', adminController.listBackups);
router.post('/backups/run', adminController.runBackup);
router.post('/backups/:id/restore', adminController.restoreBackup);

// 5. Audit Log Viewer
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);

// 6. Data Protection Requests
router.get('/data-requests', adminController.listDataRequests);
router.post('/data-requests', adminController.submitDataRequest);
router.patch('/data-requests/:id/approve', adminController.approveDataRequest);
router.patch('/data-requests/:id/execute', adminController.executeDataRequest);

module.exports = router;
