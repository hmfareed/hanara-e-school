const mongoose = require('mongoose');

const classSubjectAssignmentSchema = new mongoose.Schema(
  {
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
      ref: 'Staff',
      required: [true, 'Teacher is required'],
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required'],
    },
  },
  {
    timestamps: true,
  }
);

// A subject can only be assigned once per class per academic year
classSubjectAssignmentSchema.index(
  { class: 1, subject: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('ClassSubjectAssignment', classSubjectAssignmentSchema);
