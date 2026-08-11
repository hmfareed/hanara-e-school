const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['uniform', 'textbook', 'stationery', 'canteen_ticket', 'other'],
      default: 'uniform',
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    quantityInStock: {
      type: Number,
      required: [true, 'Quantity in stock is required'],
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      default: 5,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StoreItem', storeItemSchema);
