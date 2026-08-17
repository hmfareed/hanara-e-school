const mongoose = require('mongoose');

const promotionLogSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    fromClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    toClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    fromAcademicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    toAcademicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    action: {
      type: String,
      enum: ['promoted', 'repeated', 'graduated', 'withdrawn', 'custom'],
      required: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

promotionLogSchema.index({ student: 1, toAcademicYear: 1 });
promotionLogSchema.index({ fromAcademicYear: 1, toAcademicYear: 1 });

module.exports = mongoose.model('PromotionLog', promotionLogSchema);
