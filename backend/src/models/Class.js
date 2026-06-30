const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassLevel',
      required: [true, 'Class level is required'],
    },
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      // e.g. "Primary 4A" if streamed, or just "Primary 4"
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic year is required'],
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    formTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    capacity: {
      type: Number,
      default: 40,
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index({ academicYear: 1, level: 1 });

module.exports = mongoose.model('Class', classSchema);
