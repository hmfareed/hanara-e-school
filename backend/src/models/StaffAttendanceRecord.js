const mongoose = require('mongoose');

const correctionSchema = new mongoose.Schema(
  {
    fieldChanged: { type: String, required: true }, // e.g. "checkInTime", "status"
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    reason: { type: String, required: true },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    correctedByName: { type: String, default: 'Admin' },
    correctedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      default: null,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceDevice',
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'on_leave', 'half_day'],
      required: [true, 'Status is required'],
    },
    checkInTime: {
      type: String, // "HH:mm" (24h)
      default: null,
    },
    checkOutTime: {
      type: String, // "HH:mm" (24h)
      default: null,
    },
    checkInStatus: {
      type: String,
      enum: ['PRESENT', 'LATE', 'NONE'],
      default: 'NONE',
    },
    checkOutStatus: {
      type: String,
      enum: ['CHECKED_OUT', 'NONE'],
      default: 'NONE',
    },
    totalMinutes: {
      type: Number,
      default: 0,
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
    // Branch at check-in (Zogbeli or Vittin)
    branch: {
      type: String,
      enum: ['Zogbeli', 'Vittin'],
      default: 'Zogbeli',
    },
    branchLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Who recorded this: 'kiosk' = scanned at scanner, 'self' = staff self check-in, 'admin' = admin override
    markedByRole: {
      type: String,
      enum: ['kiosk', 'self', 'admin'],
      default: 'kiosk',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    lateNotificationSent: {
      type: Boolean,
      default: false,
    },
    // Immutable correction history array
    corrections: [correctionSchema],
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
