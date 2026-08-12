const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Session name is required'], // e.g. "Morning Attendance"
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      index: true,
    },
    startTime: {
      type: String, // HH:mm (e.g. "06:00")
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // HH:mm (e.g. "10:00")
      required: [true, 'End time is required'],
    },
    lateThresholdTime: {
      type: String, // HH:mm (e.g. "08:00")
      required: [true, 'Late threshold time is required'],
    },
    sessionType: {
      type: String,
      enum: ['single_daily', 'morning', 'afternoon'],
      default: 'single_daily',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED', 'SCHEDULED'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
