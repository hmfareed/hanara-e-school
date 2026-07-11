const mongoose = require('mongoose');

const integrationHealthSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      unique: true,
      enum: ['mnotify_sms', 'hubtel_sms', 'paystack', 'momo_webhook'],
    },
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'healthy',
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    lastSuccessAt: {
      type: Date,
      default: Date.now,
    },
    lastFailureAt: {
      type: Date,
      default: null,
    },
    lastFailureReason: {
      type: String,
      default: '',
    },
    creditsRemaining: {
      type: Number,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('IntegrationHealth', integrationHealthSchema);
