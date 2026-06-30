const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'teacher', 'accountant', 'parent', 'driver'],
      required: [true, 'Role is required'],
    },
    refStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    refGuardian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // set to 'pending' for staff self-registrations
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Refresh token storage (hashed)
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare plain password to stored hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Don't return sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
