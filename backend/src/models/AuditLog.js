const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      required: true,
      // e.g. "FINALIZE_REPORT_CARD", "UPDATE_STUDENT", "VOID_INVOICE", "RECORD_PAYMENT"
    },
    entityType: {
      type: String,
      required: true,
      // e.g. "StudentReport", "Student", "Invoice", "Payment"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: true,
    // Never modify audit logs after creation
    versionKey: false,
  }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
