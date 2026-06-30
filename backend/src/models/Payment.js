const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  method: {
    type: String,
    enum: ['cash', 'bank', 'momo', 'card'],
    required: true,
  },
  provider: {
    type: String,
    enum: ['mtn', 'telecel', 'airteltigo', 'hubtel', 'paystack', 'manual', 'sandbox'],
    default: 'manual',
  },
  transactionRef: {
    type: String,
    trim: true,
    // Not unique globally — manual payments may not have one
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed'],
    default: 'successful',   // manual payments are instantly successful
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Raw webhook body from MoMo provider — kept for reconciliation/audit
  gatewayPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  notes: { type: String, trim: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ student: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionRef: 1 }, { sparse: true });

// Auto-generate receipt number before first save
paymentSchema.pre('save', async function (next) {
  if (!this.receiptNumber && this.status === 'successful') {
    const count = await this.constructor.countDocuments({ status: 'successful' });
    const year = new Date().getFullYear();
    this.receiptNumber = `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
