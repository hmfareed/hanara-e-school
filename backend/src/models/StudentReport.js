const mongoose = require('mongoose');

const studentReportSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYear: { type: String, required: true },
    term: { type: String, enum: ['1', '2', '3'], required: true },
    conductRemarks: { type: String, default: '' },
    attendanceSummary: {
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    promotionDecision: { type: String, default: '' },
    formTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentReport', studentReportSchema);
