const mongoose = require('mongoose');

const dailyFeeRegisterSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    records: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: [true, 'Student reference is required'],
        },
        status: {
          type: String,
          enum: ['both', 'feeding', 'absent', 'unpaid'],
          required: [true, 'Payment status is required'],
        },
        amountPaid: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorder reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one register per class per date
dailyFeeRegisterSchema.index({ class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyFeeRegister', dailyFeeRegisterSchema);
