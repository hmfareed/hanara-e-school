const mongoose = require('mongoose');

const subjectAssignmentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    academicYear: { type: String, required: true },
    term: { type: String, enum: ['1', '2', '3'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectAssignmentSchema.index(
  { teacher: 1, class: 1, subject: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('SubjectAssignment', subjectAssignmentSchema);
