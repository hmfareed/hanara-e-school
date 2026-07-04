const mongoose = require('mongoose');

const mockResultSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true },
    aggregate: { type: Number, required: true, min: 6 },
    date: { type: Date, required: true },
  },
  { _id: false }
);

const beceCandidateSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    registrationStatus: {
      type: String,
      enum: ['not_started', 'registered', 'confirmed', 'withdrawn'],
      default: 'not_started',
    },
    indexNumber: {
      type: String,
      default: '',
      trim: true,
    },
    mockResults: [mockResultSchema],
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Each student can only have one BECE candidate record per academic year
beceCandidateSchema.index({ student: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('BeceCandidate', beceCandidateSchema);
