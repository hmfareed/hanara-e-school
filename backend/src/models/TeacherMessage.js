const mongoose = require('mongoose');

const teacherMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recipientRole: {
      type: String,
      enum: ['admin', 'staff', 'parent', 'class_parents'],
      default: 'admin',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    subject: {
      type: String,
      required: [true, 'Message subject is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sendSmsAlert: {
      type: Boolean,
      default: false,
    },
    smsStatus: {
      type: String,
      enum: ['none', 'sent', 'failed'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherMessage', teacherMessageSchema);
