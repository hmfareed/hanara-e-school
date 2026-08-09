const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
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
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', TimetableSchema);
