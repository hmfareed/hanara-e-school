const mongoose = require('mongoose');

const mockSubjectEntrySchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockExamSeries',
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isCore: {
      // English, Math, Science, Social Studies = true; all others = false
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reopened'],
      default: 'draft',
    },
    studentCount: {
      // Total active students in the class at time of entry creation
      type: Number,
      default: 0,
    },
    enteredCount: {
      // Scores actually entered so far (non-null rawScore rows)
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique per series × class × subject
mockSubjectEntrySchema.index(
  { seriesId: 1, classId: 1, subjectId: 1 },
  { unique: true }
);
mockSubjectEntrySchema.index({ seriesId: 1, teacherId: 1 });
mockSubjectEntrySchema.index({ seriesId: 1, status: 1 });

module.exports = mongoose.model('MockSubjectEntry', mockSubjectEntrySchema);
