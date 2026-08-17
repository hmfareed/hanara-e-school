const mongoose = require('mongoose');

/**
 * AttendanceLocationOverride — temporary branch assignment for a staff member.
 * Per architecture section 20 of att-arc.md.
 *
 * When an admin temporarily moves a teacher to another branch (e.g. Mrs. A
 * normally at Zogbeli but covering at Vittin for 3 days), a record is created
 * here. The attendance engine checks for an active override before using the
 * staff member's permanent branch from the Staff model.
 */
const attendanceLocationOverrideSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    // The staff member's permanent branch (for reference/display)
    permanentBranch: {
      type: String,
      enum: ['Zogbeli', 'Vittin', 'Both'],
      required: true,
    },
    // The temporary branch they should check in at during this period
    temporaryBranch: {
      type: String,
      enum: ['Zogbeli', 'Vittin'],
      required: true,
    },
    // Inclusive date range (stored as UTC midnight)
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Admin-supplied reason for the override
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attendanceLocationOverrideSchema.index({ staff: 1, startDate: 1, endDate: 1 });
attendanceLocationOverrideSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('AttendanceLocationOverride', attendanceLocationOverrideSchema);
