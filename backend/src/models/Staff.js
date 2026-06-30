const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
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
    otherNames: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    dob: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
      required: [true, 'Phone is required'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true, // allow null/undefined to coexist
    },
    address: {
      type: String,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    employmentDate: {
      type: Date,
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'on_leave', 'terminated', 'retired'],
      default: 'active',
    },
    role: {
      type: String,
      enum: ['teacher', 'accountant', 'admin', 'driver', 'support'],
      required: [true, 'Staff role is required'],
    },
    // Classes this staff member is assigned to (as class teacher or subject teacher)
    classesAssigned: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

staffSchema.virtual('fullName').get(function () {
  return [this.firstName, this.otherNames, this.lastName]
    .filter(Boolean)
    .join(' ');
});

module.exports = mongoose.model('Staff', staffSchema);
