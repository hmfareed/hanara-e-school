const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['birth_certificate', 'medical_record', 'transfer_letter', 'photo_id', 'other'],
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const studentSchema = new mongoose.Schema(
  {
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true,
      trim: true,
      // Format: HNRA/YYYY/NNNN e.g. HNRA/2026/0001
    },
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
      enum: ['male', 'female'],
      required: [true, 'Gender is required'],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    photoUrl: {
      type: String,
      default: null,
    },
    currentClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    guardians: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guardian',
      },
    ],
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'graduated', 'transferred', 'withdrawn'],
      default: 'active',
    },
    // Minimal medical info — only what staff genuinely need per spec
    medicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    transport: {
      usesBus: {
        type: Boolean,
        default: false,
      },
      bus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        default: null,
      },
      stop: {
        type: String,
        default: '',
      },
    },
    dailyFeeConfig: {
      planType: {
        type: String,
        enum: [
          'both_daily',
          'feeding_only_daily',
          'bus_only_daily',
          'feeding_weekly_bus_daily',
          'feeding_weekly_only',
          'both_weekly',
          'exempt',
        ],
        default: 'both_daily',
      },
      feedingPlan: {
        type: String,
        enum: ['daily', 'weekly', 'exempt'],
        default: 'daily',
      },
      feedingWeeklyAmount: {
        type: Number,
        default: 20,
      },
      busPlan: {
        type: String,
        enum: ['daily', 'weekly', 'none'],
        default: 'daily',
      },
      busWeeklyAmount: {
        type: Number,
        default: 25,
      },
      customFeedingRate: {
        type: Number,
        default: null,
      },
      customBusRate: {
        type: Number,
        default: null,
      },
      notes: {
        type: String,
        default: '',
      },
    },
    documents: [documentSchema],
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

studentSchema.virtual('fullName').get(function () {
  return [this.firstName, this.otherNames, this.lastName]
    .filter(Boolean)
    .join(' ');
});

studentSchema.index({ currentClass: 1 });
studentSchema.index({ status: 1 });

module.exports = mongoose.model('Student', studentSchema);
