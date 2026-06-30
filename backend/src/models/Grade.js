const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectAssignment', required: true },
    academicYear: { type: String, required: true },
    term: { type: String, enum: ['1', '2', '3'], required: true },
    classExercise1: { type: Number, default: 0, min: 0, max: 10 },
    classExercise2: { type: Number, default: 0, min: 0, max: 10 },
    classExercise3: { type: Number, default: 0, min: 0, max: 5 },
    classExercise4: { type: Number, default: 0, min: 0, max: 5 },
    weeklyTest: { type: Number, default: 0, min: 0, max: 20 },
    homework1: { type: Number, default: 0, min: 0, max: 10 },
    homework2: { type: Number, default: 0, min: 0, max: 10 },
    homework3: { type: Number, default: 0, min: 0, max: 5 },
    homework4: { type: Number, default: 0, min: 0, max: 5 },
    rawClassScore: { type: Number, default: 0, min: 0, max: 80 },
    classScore: { type: Number, default: 0, min: 0, max: 30 },
    rawExamScore: { type: Number, default: 0, min: 0, max: 100 },
    examScore: { type: Number, default: 0, min: 0, max: 70 },
    totalScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Grade', gradeSchema);
