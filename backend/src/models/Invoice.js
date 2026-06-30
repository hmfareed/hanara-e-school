const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
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
    trim: true,
  },
  amountDue: {
    type: Number,
    required: true,
    min: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  balance: {
    type: Number,
    default: function () { return this.amountDue; },
    min: 0,
  },
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue'],
    default: 'unpaid',
  },
  invoiceNumber: {
    type: String,
    unique: true,
    trim: true,
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

// One invoice per student per fee structure (per term per year)
invoiceSchema.index(
  { student: 1, feeStructure: 1 },
  { unique: true }
);
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ student: 1, academicYear: 1 });

// Recompute balance + status whenever amountPaid changes
invoiceSchema.methods.recalculate = function () {
  this.balance = Math.max(0, this.amountDue - this.amountPaid);
  if (this.amountPaid >= this.amountDue) {
    this.status = 'paid';
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  } else {
    this.status = 'unpaid';
  }
};

// Auto-generate invoice number before first save
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.recalculate();
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
