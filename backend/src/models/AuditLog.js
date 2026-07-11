const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    actingAs: {
      type: String,
      enum: ['admin', 'teacher', 'accountant', 'parent', 'driver', 'superadmin', null],
      default: null,
    },
    action: {
      type: String,
      required: true, // e.g. "grade.update" | "account.create" | "settings.change" | "backup.restore"
    },
    targetType: {
      type: String,
      required: true, // e.g. "Student" | "User" | "SystemSetting" | "Payment"
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    beforeValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['info', 'sensitive', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
