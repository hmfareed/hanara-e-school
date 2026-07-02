const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
      unique: true,
    },
    pickupTime: {
      type: String,
      default: '07:00 AM',
      trim: true,
    },
    dropoffTime: {
      type: String,
      default: '03:00 PM',
      trim: true,
    },
    stops: [
      {
        name: {
          type: String,
          required: [true, 'Stop name is required'],
          trim: true,
        },
        order: {
          type: Number,
          required: [true, 'Stop order is required'],
        },
        approxPickupTime: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Route', routeSchema);
