const mongoose = require('mongoose');

const submissionLineItemSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
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
}, { _id: false });

const feeCollectionSubmissionSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required'],
  },
  submittingTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitting teacher is required'],
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  lineItems: [submissionLineItemSchema],
  totals: {
    feedingTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    busFareTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'discrepancy_flagged', 'resolved'],
    default: 'pending',
  },
  submissionTimestamp: {
    type: Date,
    default: Date.now,
  },
  // Accountant-side confirmation fields
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  confirmedAt: {
    type: Date,
    default: null,
  },
  actuallyCountedAmount: {
    type: Number,
    default: null,
  },
  discrepancyNotes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Enforce unique submission per class per date
feeCollectionSubmissionSchema.index({ class: 1, date: 1 }, { unique: true });
feeCollectionSubmissionSchema.index({ status: 1 });
feeCollectionSubmissionSchema.index({ date: 1 });

module.exports = mongoose.model('FeeCollectionSubmission', feeCollectionSubmissionSchema);
