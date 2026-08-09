const mongoose = require('mongoose');

const learningResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
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
    resourceType: {
      type: String,
      enum: ['document', 'pdf', 'link', 'past_question', 'syllabus'],
      default: 'document',
    },
    url: {
      type: String,
      required: [true, 'Resource URL or link is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      default: '1',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningResource', learningResourceSchema);
