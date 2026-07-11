const mongoose = require('mongoose');

const mockExamResultSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockExamSeries',
      required: true,
    },
    subjectEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockSubjectEntry',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    rawScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      // null = not yet entered
    },
    grade: {
      type: Number,
      min: 1,
      max: 9,
      default: null,
      // Computed via BECE grading engine from rawScore
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Unique per series × student × subject
mockExamResultSchema.index(
  { seriesId: 1, studentId: 1, subjectId: 1 },
  { unique: true }
);
mockExamResultSchema.index({ seriesId: 1, classId: 1 });
mockExamResultSchema.index({ subjectEntryId: 1 });

module.exports = mongoose.model('MockExamResult', mockExamResultSchema);
