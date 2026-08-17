const mongoose = require('mongoose');

/**
 * AttendanceAttempt — records every rejected check-in / check-out attempt.
 * Per architecture section 25 & 26 of att-arc.md.
 * Allows admin to see when, where, and why a staff member's attendance was denied.
 */
const attendanceAttemptSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    attemptType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // GPS coordinates submitted by the device
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    // GPS accuracy reported by device (meters)
    accuracy: { type: Number, default: null },

    // Branch the staff member is assigned to
    assignedBranch: {
      type: String,
      enum: ['Zogbeli', 'Vittin', 'Both', null],
      default: null,
    },
    // Distance calculated server-side from assigned branch coordinates (meters)
    distanceFromBranch: { type: Number, default: null },

    // Configured geofence radius at time of attempt
    configuredRadius: { type: Number, default: null },
    // Configured max GPS accuracy at time of attempt
    configuredMaxAccuracy: { type: Number, default: null },

    // Standardised rejection code (architecture section 26)
    rejectionCode: {
      type: String,
      enum: [
        'GPS_PERMISSION_DENIED',
        'GPS_UNAVAILABLE',
        'GPS_TIMEOUT',
        'GPS_ACCURACY_TOO_LOW',
        'OUTSIDE_GEOFENCE',
        'NOT_ASSIGNED_TO_BRANCH',
        'ALREADY_CHECKED_IN',
        'ALREADY_CHECKED_OUT',
        'CHECKOUT_WITHOUT_CHECKIN',
        'ATTENDANCE_NOT_OPEN',
        'ATTENDANCE_CLOSED',
        'ACCOUNT_DISABLED',
        'BRANCH_NOT_CONFIGURED',
        'UNKNOWN',
      ],
      required: true,
    },
    // Human-readable rejection message
    rejectionMessage: { type: String, default: '' },

    // Network / device metadata
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

attendanceAttemptSchema.index({ staff: 1, timestamp: -1 });
attendanceAttemptSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AttendanceAttempt', attendanceAttemptSchema);
