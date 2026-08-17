const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'driver', 'system_admin'],
      default: 'parent',
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ user: 1 });
pushSubscriptionSchema.index({ role: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
