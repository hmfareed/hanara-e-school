const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
      // e.g. "08:00 AM" or "08:00"
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
      // e.g. "08:45 AM" or "08:45"
    },
    periodType: {
      type: String,
      enum: ['lesson', 'break', 'assembly', 'pe_sports', 'library', 'club', 'worship'],
      default: 'lesson',
    },
    topic: {
      type: String,
      default: '',
      trim: true,
    },
    room: {
      type: String,
      default: '',
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2026/2027',
      trim: true,
    },
    term: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
  },
  { timestamps: true }
);

TimetableSchema.index({ class: 1, day: 1, startTime: 1 });
TimetableSchema.index({ teacher: 1, day: 1, startTime: 1 });
TimetableSchema.index({ room: 1, day: 1, startTime: 1 });
TimetableSchema.index({ academicYear: 1, class: 1 });

module.exports = mongoose.model('Timetable', TimetableSchema);
