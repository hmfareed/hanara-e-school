const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: [true, 'Recipient phone number is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['attendance_absence', 'fee_invoice', 'fee_payment', 'broadcast'],
      required: [true, 'SMS type is required'],
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
    },
    provider: {
      type: String,
      enum: ['arkesel', 'hubtel', 'mock'],
      required: [true, 'SMS provider is required'],
    },
    error: {
      type: String,
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

smsLogSchema.index({ recipient: 1 });
smsLogSchema.index({ status: 1 });
smsLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SmsLog', smsLogSchema);
