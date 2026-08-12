const mongoose = require('mongoose');

const attendanceCredentialSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff is required'],
      index: true,
    },
    // Cryptographic hash of the raw token (e.g. SHA-256 of HAN_ATT_...)
    credentialHash: {
      type: String,
      required: [true, 'Credential hash is required'],
      unique: true,
      index: true,
    },
    // Non-secret prefix for reference/display (e.g., "HAN_ATT_7F9A...")
    tokenPrefix: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AttendanceCredential', attendanceCredentialSchema);
