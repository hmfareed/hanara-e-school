const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      trim: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Bus capacity is required'],
      default: 30,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bus', busSchema);
