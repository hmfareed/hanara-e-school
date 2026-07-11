const mongoose = require('mongoose');

const gradeEntrySchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectName: { type: String, default: '' },
    grade: { type: Number, min: 1, max: 9 },
  },
  { _id: false }
);

const mockAggregateSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockExamSeries',
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
    coreGrades: [gradeEntrySchema],          // All 4 core subjects
    electiveGrades: [gradeEntrySchema],       // All electives the student took
    bestElectivesUsed: [gradeEntrySchema],    // Best 2 electives (lowest grade numbers = better)
    aggregate: {
      type: Number,
      default: null,
      // Sum of 4 core grades + best 2 elective grades (6–30, lower = better)
    },
    classPosition: {
      type: Number,
      default: null,
    },
    cohortPosition: {
      type: Number,
      default: null,
      // Position across all JHS 3 streams combined
    },
    isComplete: {
      type: Boolean,
      default: false,
      // true once all 4 core + at least 2 electives are submitted for this student
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique per series × student
mockAggregateSchema.index(
  { seriesId: 1, studentId: 1 },
  { unique: true }
);
mockAggregateSchema.index({ seriesId: 1, classId: 1, aggregate: 1 });
mockAggregateSchema.index({ seriesId: 1, cohortPosition: 1 });

module.exports = mongoose.model('MockAggregate', mockAggregateSchema);
