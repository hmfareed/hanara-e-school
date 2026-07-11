const mongoose = require('mongoose');

const mockExamSeriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Series name is required'],
      trim: true,
      // e.g. "Mock 1", "Mock 2", "March Mock"
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      // e.g. "2025/2026"
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      // Used for sequencing trend charts
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

mockExamSeriesSchema.index({ academicYear: 1, order: 1 });

module.exports = mongoose.model('MockExamSeries', mockExamSeriesSchema);
