const mongoose = require('mongoose');

const lessonPlanSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      default: '1',
    },
    weekNumber: {
      type: Number,
      required: [true, 'Week number is required'],
      min: 1,
      max: 20,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
    },
    subTopic: {
      type: String,
      trim: true,
      default: '',
    },
    objectives: {
      type: String,
      required: [true, 'Objectives are required'],
      trim: true,
    },
    teacherActivities: {
      type: String,
      trim: true,
      default: '',
    },
    studentActivities: {
      type: String,
      trim: true,
      default: '',
    },
    teachingMaterials: {
      type: String,
      trim: true,
      default: '',
    },
    assessment: {
      type: String,
      trim: true,
      default: '',
    },
    homework: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
    },
    feedback: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
