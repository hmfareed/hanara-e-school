const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      enum: ['father', 'mother', 'guardian', 'sibling', 'grandparent', 'uncle', 'aunt', 'other'],
      required: [true, 'Relationship is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    altPhone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    occupation: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
    },
    momoNumber: {
      type: String,
      trim: true,
      default: null,
    },
    momoProvider: {
      type: String,
      enum: ['mtn', 'telecel', 'airteltigo', null],
      default: null,
    },
    // Data Protection Act (Ghana) consent capture
    consentDataProcessing: {
      granted: {
        type: Boolean,
        default: false,
      },
      grantedAt: {
        type: Date,
        default: null,
      },
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
  },
  {
    timestamps: true,
  }
);

guardianSchema.index({ phone: 1 });

module.exports = mongoose.model('Guardian', guardianSchema);
