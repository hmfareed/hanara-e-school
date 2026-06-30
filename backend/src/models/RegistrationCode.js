const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      length: 6,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Code does not expire — kept for historical reference only
    isActive: {
      type: Boolean,
      default: true, // superadmin can revoke a code by setting this to false
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: String, // email of who used it
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema);
