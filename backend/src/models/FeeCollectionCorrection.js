const mongoose = require('mongoose');

const feeCollectionCorrectionSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeCollectionSubmission',
    required: [true, 'Submission reference is required'],
  },
  correctedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User making the correction is required'],
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required'],
  },
  feedingStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'absent'],
    required: true,
  },
  feedingAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  busStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'absent'],
    required: true,
  },
  busAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    required: [true, 'Correction reason is required'],
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

feeCollectionCorrectionSchema.index({ submission: 1 });
feeCollectionCorrectionSchema.index({ student: 1 });

module.exports = mongoose.model('FeeCollectionCorrection', feeCollectionCorrectionSchema);
