const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['parent', 'teacher', 'admin'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const parentQuerySchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    guardian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    type: {
      type: String,
      enum: ['sick_leave', 'permission', 'academic_query', 'general'],
      default: 'general',
    },
    subject: {
      type: String,
      required: [true, 'Subject title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
    },
    permissionDates: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'replied', 'closed'],
      default: 'pending',
    },
    replies: [replySchema],
  },
  { timestamps: true }
);

parentQuerySchema.index({ class: 1, parent: 1, status: 1 });

module.exports = mongoose.model('ParentQuery', parentQuerySchema);
