const mongoose = require('mongoose');

const schoolProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
    },
    motto: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    currentAcademicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
    },
    dataProtectionRegistrationNumber: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SchoolProfile', schoolProfileSchema);
