const mongoose = require('mongoose');

const reportVerificationSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    admissionNumber: {
      type: String,
      required: true,
    },
    className: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    summary: {
      overallScore: Number,
      totalSubjects: Number,
      classPosition: String,
      averagePercentage: Number,
      gradeSummary: String,
      headmasterRemark: String,
    },
    verificationHash: {
      type: String,
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ReportVerification', reportVerificationSchema);
