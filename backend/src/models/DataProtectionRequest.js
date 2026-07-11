const mongoose = require('mongoose');

const dataProtectionRequestSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ['export', 'delete'],
      required: true,
    },
    subjectType: {
      type: String,
      enum: ['Student', 'Parent', 'Staff'],
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requestedBy: {
      type: String,
      required: true, // e.g. parent name requesting data removal
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'executed', 'rejected'],
      default: 'pending_approval',
    },
    executedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DataProtectionRequest', dataProtectionRequestSchema);
