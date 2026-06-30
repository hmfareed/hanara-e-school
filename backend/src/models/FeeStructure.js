const mongoose = require('mongoose');

const feeItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },    // "Tuition", "Transport", "Feeding"
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const feeStructureSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true,
  },
  termName: {
    type: String,
    required: true,
    trim: true,   // "Term 1", "Term 2", "Term 3"
  },
  items: {
    type: [feeItemSchema],
    validate: {
      validator: (v) => v && v.length > 0,
      message: 'At least one fee item is required',
    },
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Enforce one fee structure per class per term per academic year
feeStructureSchema.index(
  { class: 1, academicYear: 1, termName: 1 },
  { unique: true }
);

// Compute totalAmount before saving
feeStructureSchema.pre('save', function (next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);
  next();
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
