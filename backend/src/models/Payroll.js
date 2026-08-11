const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff user ID is required'],
    },
    month: {
      type: String, // Format: YYYY-MM (e.g. 2026-08)
      required: [true, 'Payroll month is required'],
      trim: true,
    },
    basicSalary: {
      type: Number,
      default: 0,
      min: [0, 'Basic salary cannot be negative'],
    },
    allowances: {
      formTeacher: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      responsibility: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
    },
    deductions: {
      taxSSNIT: { type: Number, default: 0 },
      attendanceAbsence: { type: Number, default: 0 },
      loans: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'momo', 'cash'],
      default: 'bank_transfer',
    },
    referenceNumber: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate gross & net salary before saving
payrollSchema.pre('save', function (next) {
  const allowTotal =
    (this.allowances?.formTeacher || 0) +
    (this.allowances?.transport || 0) +
    (this.allowances?.responsibility || 0) +
    (this.allowances?.bonus || 0);

  const deductTotal =
    (this.deductions?.taxSSNIT || 0) +
    (this.deductions?.attendanceAbsence || 0) +
    (this.deductions?.loans || 0) +
    (this.deductions?.other || 0);

  this.grossSalary = (this.basicSalary || 0) + allowTotal;
  this.netSalary = Math.max(0, this.grossSalary - deductTotal);
  next();
});

payrollSchema.index({ staff: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
