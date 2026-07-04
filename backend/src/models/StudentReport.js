const mongoose = require('mongoose');

const studentReportSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYear: { type: String, required: true },
    term: { type: String, enum: ['1', '2', '3'], required: true },

    // Remarks
    conductRemarks: { type: String, default: '' },
    classTeacherRemark: { type: String, default: '' },
    headTeacherRemark: { type: String, default: '' },

    // Attendance summary (manually updated by form teacher)
    attendanceSummary: {
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // Promotion / finalization
    promotionDecision: { type: String, default: '' },
    isFinalized: { type: Boolean, default: false },
    finalizedAt: { type: Date, default: null },

    // Computed ranking fields (populated by grading.service calculateClassRankings)
    position: { type: Number, default: null },
    totalStudents: { type: Number, default: null },
    studentAverage: { type: Number, default: null },
    classAverage: { type: Number, default: null },

    formTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Compound unique index - one report per student per class per term per year
studentReportSchema.index({ student: 1, class: 1, academicYear: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('StudentReport', studentReportSchema);
