const mongoose = require('mongoose');

const dailyFeeStructureSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null, // Scoped to a specific class if set
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassLevel',
    default: null, // Scoped to a grade level (ClassLevel) if set
  },
  feedingFeeAmount: {
    type: Number,
    required: [true, 'Feeding fee amount is required'],
    min: [0, 'Feeding fee cannot be negative'],
    default: 0,
  },
  busFareAmount: {
    type: Number,
    required: [true, 'Bus fare amount is required'],
    min: [0, 'Bus fare cannot be negative'],
    default: 0,
  },
  effectiveStartDate: {
    type: Date,
    required: [true, 'Effective start date is required'],
    default: Date.now,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin reference is required'],
  },
}, {
  timestamps: true,
});

// Index to easily find active structure for a class/level sorting by effective date descending
dailyFeeStructureSchema.index({ class: 1, level: 1, effectiveStartDate: -1 });

module.exports = mongoose.model('DailyFeeStructure', dailyFeeStructureSchema);
