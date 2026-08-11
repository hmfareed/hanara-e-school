const mongoose = require('mongoose');

const staffAttendanceRecordSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'on_leave', 'half_day'],
      required: [true, 'Status is required'],
    },
    checkInTime: {
      type: String, // e.g. "07:45"  (HH:mm 24h)
      default: null,
    },
    checkOutTime: {
      type: String, // e.g. "15:30"
      default: null,
    },
    // GPS coordinates captured at check-in
    checkInLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Distance from school at check-in (metres) — computed server-side
    distanceFromSchool: {
      type: Number,
      default: null,
    },
    // Whether the check-in passed geofence validation
    geofenceVerified: {
      type: Boolean,
      default: false,
    },
    // Who recorded this: 'self' = staff themselves, 'admin' = admin override
    markedByRole: {
      type: String,
      enum: ['self', 'admin'],
      default: 'self',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'markedBy is required'],
    },
    term: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Tracks whether a late-arrival notification was sent to admin
    lateNotificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One record per staff per day
staffAttendanceRecordSchema.index({ staff: 1, date: 1 }, { unique: true });

// Fast admin daily overview query
staffAttendanceRecordSchema.index({ date: 1 });

// Staff history query
staffAttendanceRecordSchema.index({ staff: 1, date: -1 });

module.exports = mongoose.model('StaffAttendanceRecord', staffAttendanceRecordSchema);
