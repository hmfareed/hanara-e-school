const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: [true, 'Status is required'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorder is required'],
    },
    // Reference to a term subdocument _id in AcademicYear
    term: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    smsAlertSent: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hot query paths: attendance by class+date, student history
attendanceRecordSchema.index({ class: 1, date: 1 });
attendanceRecordSchema.index({ student: 1, date: 1 });

// Upsert key: one record per student per day per class
attendanceRecordSchema.index(
  { student: 1, class: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
