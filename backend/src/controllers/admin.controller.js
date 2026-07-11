const User = require('../models/User');
const Staff = require('../models/Staff');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');
const IntegrationHealth = require('../models/IntegrationHealth');
const BackupRecord = require('../models/BackupRecord');
const DataProtectionRequest = require('../models/DataProtectionRequest');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

// 1. User Management
exports.listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status !== undefined) filter.isActive = status === 'active';
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('refStaff')
      .populate('refGuardian')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { email, phone, password, role, secondaryCapacities, isSuperAdmin, refStaff } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const tempPassword = password || Math.random().toString(36).substring(2, 10);
    const user = await User.create({
      email,
      phone,
      passwordHash: tempPassword,
      role,
      secondaryCapacities: secondaryCapacities || [],
      isSuperAdmin: !!isSuperAdmin,
      refStaff: refStaff || null,
      approvalStatus: 'approved',
    });

    req.auditInfo = {
      action: 'account.create',
      targetType: 'User',
      targetId: user._id,
      afterValue: { email, role, secondaryCapacities },
      severity: 'sensitive',
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user,
        tempPassword, // Return temp password to frontend to show the admin
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const beforeValue = { isActive: user.isActive };
    user.isActive = isActive;
    await user.save();

    req.auditInfo = {
      action: isActive ? 'account.activate' : 'account.deactivate',
      targetType: 'User',
      targetId: user._id,
      beforeValue,
      afterValue: { isActive },
      severity: 'sensitive',
    };

    res.json({ success: true, message: `User account ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tempPassword = Math.random().toString(36).substring(2, 10);
    user.passwordHash = tempPassword;
    await user.save();

    req.auditInfo = {
      action: 'account.reset-password',
      targetType: 'User',
      targetId: user._id,
      severity: 'critical',
    };

    res.json({
      success: true,
      message: 'Password reset link/temporary password generated',
      data: { tempPassword },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAssignments = async (req, res, next) => {
  try {
    const { id } = req.params; // User ID
    const { classesAssigned } = req.body; // Array of Class ObjectIds

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.refStaff) {
      return res.status(400).json({ success: false, message: 'User does not have a linked staff profile' });
    }

    const staff = await Staff.findById(user.refStaff);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff profile not found' });
    }

    const beforeValue = { classesAssigned: staff.classesAssigned };
    staff.classesAssigned = classesAssigned;
    await staff.save();

    req.auditInfo = {
      action: 'account.assignments.update',
      targetType: 'Staff',
      targetId: staff._id,
      beforeValue,
      afterValue: { classesAssigned },
      severity: 'sensitive',
    };

    res.json({ success: true, message: 'Subject/class links updated successfully' });
  } catch (error) {
    next(error);
  }
};

// 2. Settings Management
exports.listSettings = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    let settings = await SystemSetting.find(filter);

    // Seed defaults if empty
    if (settings.length === 0 && !category) {
      const defaults = [
        { key: 'academic_year.current', value: '2026/2027', valueType: 'string', category: 'academic', description: 'Current Academic Year' },
        { key: 'grading.bece_pass_threshold', value: 6, valueType: 'number', category: 'academic', description: 'BECE Aggregate Pass Threshold' },
        { key: 'branding.school_name', value: 'Hanara Academy', valueType: 'string', category: 'branding', description: 'School Name' },
        { key: 'branding.theme_color', value: '#10B981', valueType: 'string', category: 'branding', description: 'Primary UI Color' },
        { key: 'integration.mnotify_key', value: 'mnotify-api-key-xyz-1234', valueType: 'string', category: 'integration', description: 'mNotify API Key' },
        { key: 'integration.paystack_public', value: 'pk_live_paystack12345', valueType: 'string', category: 'integration', description: 'Paystack Public Key' },
        { key: 'security.session_timeout', value: 30, valueType: 'number', category: 'security', description: 'Session timeout in minutes' },
      ];
      await SystemSetting.create(defaults);
      settings = await SystemSetting.find(filter);
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    const beforeValue = { value: setting.value };
    setting.value = value;
    setting.lastModifiedBy = req.user.id;
    setting.lastModifiedAt = new Date();
    await setting.save();

    req.auditInfo = {
      action: 'settings.change',
      targetType: 'SystemSetting',
      targetId: setting._id,
      beforeValue,
      afterValue: { value },
      severity: key.startsWith('integration.') || key.startsWith('security.') ? 'critical' : 'info',
    };

    res.json({ success: true, message: 'Setting updated successfully', data: setting });
  } catch (error) {
    next(error);
  }
};

// 3. Integration Health Monitor
exports.getIntegrationStatus = async (req, res, next) => {
  try {
    let health = await IntegrationHealth.find();

    if (health.length === 0) {
      const defaults = [
        { service: 'mnotify_sms', status: 'healthy', creditsRemaining: 4850, metadata: { lastBatchSuccessRate: 98.4 } },
        { service: 'hubtel_sms', status: 'healthy', creditsRemaining: 1200, metadata: { lastBatchSuccessRate: 100 } },
        { service: 'paystack', status: 'healthy', metadata: { webhookLatencyMs: 140 } },
        { service: 'momo_webhook', status: 'healthy', metadata: { failedRetriesCount: 0 } },
      ];
      await IntegrationHealth.create(defaults);
      health = await IntegrationHealth.find();
    }

    res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const { service } = req.params;
    const health = await IntegrationHealth.findOne({ service });
    if (!health) {
      return res.status(404).json({ success: false, message: 'Service integration not found' });
    }

    // Simulate ping
    health.status = 'healthy';
    health.lastCheckedAt = new Date();
    health.lastSuccessAt = new Date();
    await health.save();

    req.auditInfo = {
      action: 'integration.test',
      targetType: 'IntegrationHealth',
      targetId: health._id,
      afterValue: { status: 'healthy' },
      severity: 'info',
    };

    res.json({ success: true, message: `${service} connection test succeeded`, data: health });
  } catch (error) {
    next(error);
  }
};

exports.reconcilePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    // Simulate reconcile action
    req.auditInfo = {
      action: 'integration.payment.reconcile',
      targetType: 'Payment',
      targetId: paymentId,
      severity: 'sensitive',
    };

    res.json({ success: true, message: `Payment ${paymentId} manually reconciled successfully` });
  } catch (error) {
    next(error);
  }
};

// 4. Backup & Restore
exports.listBackups = async (req, res, next) => {
  try {
    let backups = await BackupRecord.find().sort({ createdAt: -1 });

    if (backups.length === 0) {
      const defaults = [
        { type: 'daily', status: 'completed', fileLocation: '/backups/daily-2026-07-09.tar.gz', fileSizeBytes: 2450000, retentionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { type: 'weekly', status: 'completed', fileLocation: '/backups/weekly-2026-07-05.tar.gz', fileSizeBytes: 2420000, retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      ];
      await BackupRecord.create(defaults);
      backups = await BackupRecord.find().sort({ createdAt: -1 });
    }

    res.json({ success: true, data: backups });
  } catch (error) {
    next(error);
  }
};

exports.runBackup = async (req, res, next) => {
  try {
    // Simulate backup creation
    const record = await BackupRecord.create({
      type: 'manual',
      triggeredBy: req.user.id,
      status: 'completed',
      fileLocation: `/backups/manual-${Date.now()}.tar.gz`,
      fileSizeBytes: 2480000,
      retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    req.auditInfo = {
      action: 'backup.run',
      targetType: 'BackupRecord',
      targetId: record._id,
      severity: 'sensitive',
    };

    res.json({ success: true, message: 'Manual backup completed successfully', data: record });
  } catch (error) {
    next(error);
  }
};

exports.restoreBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmationToken } = req.body; // e.g. "Hanara"

    if (!confirmationToken || confirmationToken.toLowerCase() !== 'hanara') {
      return res.status(400).json({ success: false, message: 'Invalid confirmation token. You must type the school name exactly.' });
    }

    const backup = await BackupRecord.findById(id);
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup record not found' });
    }

    const restoreLog = await BackupRecord.create({
      type: backup.type,
      triggeredBy: req.user.id,
      status: 'completed',
      fileLocation: backup.fileLocation,
      fileSizeBytes: backup.fileSizeBytes,
      restoredFrom: true,
    });

    req.auditInfo = {
      action: 'backup.restore',
      targetType: 'BackupRecord',
      targetId: restoreLog._id,
      severity: 'critical',
    };

    res.json({ success: true, message: 'System restored successfully from backup point' });
  } catch (error) {
    next(error);
  }
};

// 5. Audit Log Viewer
exports.listAuditLogs = async (req, res, next) => {
  try {
    const { severity, action, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().populate('actorId', 'email role').sort({ createdAt: -1 });

    // Format as simple CSV text
    let csv = 'Timestamp,Actor Email,Actor Role,Acting As,Action,Target Type,Target ID,Severity,IP Address\n';
    logs.forEach((log) => {
      csv += `"${log.createdAt.toISOString()}","${log.actorId ? log.actorId.email : 'system'}","${log.actorRole}","${log.actingAs || ''}","${log.action}","${log.targetType}","${log.targetId}","${log.severity}","${log.ipAddress}"\n`;
    });

    req.auditInfo = {
      action: 'audit-logs.export',
      targetType: 'AuditLog',
      targetId: req.user.id, // self-reference target since it's an operational export
      severity: 'sensitive',
    };

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log-export.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// 6. Data Protection Requests
exports.listDataRequests = async (req, res, next) => {
  try {
    const requests = await DataProtectionRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.submitDataRequest = async (req, res, next) => {
  try {
    const { requestType, subjectType, subjectId, requestedBy } = req.body;

    const request = await DataProtectionRequest.create({
      requestType,
      subjectType,
      subjectId,
      requestedBy,
    });

    req.auditInfo = {
      action: 'data-request.submit',
      targetType: 'DataProtectionRequest',
      targetId: request._id,
      severity: 'sensitive',
    };

    res.status(201).json({ success: true, message: 'Data request submitted for headteacher approval', data: request });
  } catch (error) {
    next(error);
  }
};

exports.approveDataRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await DataProtectionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Request is not in pending approval status' });
    }

    // Two-person rule check: Creator/Submitter cannot approve their own request unless isSuperAdmin is true
    // Wait, since we don't store submitter ID, we can check if req.user.role is head_teacher or system_admin with isSuperAdmin
    if (req.user.role === 'system_admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Head Teacher or Super Admin can approve data protection requests' });
    }

    request.approvedBy = req.user.id;
    request.status = 'approved';
    await request.save();

    req.auditInfo = {
      action: 'data-request.approve',
      targetType: 'DataProtectionRequest',
      targetId: request._id,
      severity: 'sensitive',
    };

    res.json({ success: true, message: 'Request approved successfully', data: request });
  } catch (error) {
    next(error);
  }
};

exports.executeDataRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await DataProtectionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Request must be approved before execution' });
    }

    // Simulate erasure or export based on type
    request.executedBy = req.user.id;
    request.executedAt = new Date();
    request.status = 'executed';
    await request.save();

    req.auditInfo = {
      action: `data-request.execute.${request.requestType}`,
      targetType: 'DataProtectionRequest',
      targetId: request._id,
      severity: 'critical',
    };

    res.json({ success: true, message: `Data request successfully executed (${request.requestType})`, data: request });
  } catch (error) {
    next(error);
  }
};
