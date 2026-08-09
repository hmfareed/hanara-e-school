const mongoose = require('mongoose');

const studentScoreSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    submitted: {
      type: Boolean,
      default: true,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const offlineAssignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      default: '1',
    },
    dateGiven: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    maxMarks: {
      type: Number,
      default: 10,
      min: 1,
    },
    studentScores: [studentScoreSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('OfflineAssignment', offlineAssignmentSchema);
