const mongoose = require('mongoose');

const attendanceEventSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceDevice',
      default: null,
    },
    deviceName: {
      type: String,
      default: 'Unknown Scanner',
    },
    eventType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT', 'REJECTED', 'CORRECTION'],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    result: {
      type: String,
      enum: ['SUCCESS', 'LATE', 'REJECTED'],
      required: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    // Used when eventType === 'CORRECTION'
    correctionDetails: {
      originalTime: { type: String, default: null },
      newTime: { type: String, default: null },
      originalStatus: { type: String, default: null },
      newStatus: { type: String, default: null },
      reason: { type: String, default: '' },
      correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      correctedByName: { type: String, default: '' },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

attendanceEventSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AttendanceEvent', attendanceEventSchema);
