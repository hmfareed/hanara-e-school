const mongoose = require('mongoose');

const backupRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'manual'],
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null if triggered automatically (cron)
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'in_progress'],
      default: 'in_progress',
    },
    fileLocation: {
      type: String,
      default: '',
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
    },
    retentionExpiresAt: {
      type: Date,
      default: null,
    },
    restoredFrom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BackupRecord', backupRecordSchema);
