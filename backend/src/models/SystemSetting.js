const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required'],
    },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'date', 'json'],
      required: [true, 'Setting value type is required'],
    },
    category: {
      type: String,
      enum: ['academic', 'branding', 'integration', 'security'],
      required: [true, 'Setting category is required'],
    },
    editableBy: {
      type: [String],
      default: ['system_admin'],
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
