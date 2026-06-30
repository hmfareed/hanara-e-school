const mongoose = require('mongoose');

const classLevelSchema = new mongoose.Schema(
  {
    levelCode: {
      type: String,
      required: [true, 'Level code is required'],
      unique: true,
      trim: true,
      // e.g. N1, N2, KG1, KG2, BS1–BS9
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      // e.g. "Nursery 1", "KG 1", "Primary 1", "JHS 1"
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      // 1 = Nursery 1, 2 = Nursery 2 ... 13 = JHS 3
    },
    category: {
      type: String,
      enum: ['Nursery', 'KG', 'Primary', 'JHS'],
      required: [true, 'Category is required'],
    },
  },
  {
    timestamps: true,
  }
);

classLevelSchema.index({ order: 1 });

module.exports = mongoose.model('ClassLevel', classLevelSchema);
