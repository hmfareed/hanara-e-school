const mongoose = require('mongoose');

const behaviourRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['commendation', 'warning', 'misconduct', 'parent_meeting', 'suspension_recommendation'],
      required: [true, 'Category is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    actionTaken: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model('BehaviourRecord', behaviourRecordSchema);
