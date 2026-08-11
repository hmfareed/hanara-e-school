const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Notice content is required'],
    },
    category: {
      type: String,
      enum: ['general', 'urgent', 'academic', 'financial', 'event'],
      default: 'general',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'parents', 'teachers'],
      default: 'all',
    },
    eventDate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    smsBroadcastSent: {
      type: Boolean,
      default: false,
    },
    smsRecipientCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

noticeSchema.index({ category: 1, targetAudience: 1, isPinned: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
