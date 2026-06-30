const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['holiday', 'exam', 'event'],
      default: 'event',
    },
  },
  { _id: true }
);

const termSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    events: {
      type: [eventSchema],
      default: [],
    },
  },
  { _id: true }
);

const academicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Academic year name is required'],
      unique: true,
      trim: true,
    },
    terms: {
      type: [termSchema],
      validate: {
        validator: (v) => v.length >= 1 && v.length <= 3,
        message: 'An academic year must have 1–3 terms',
      },
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Only one academic year can be current at a time
academicYearSchema.pre('save', async function (next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isCurrent: false } }
    );
  }
  next();
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);
