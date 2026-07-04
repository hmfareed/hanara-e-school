const mongoose = require('mongoose');

const bandSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    grade: { type: String, required: true },   // e.g. "1", "A", "EX"
    label: { type: String, required: true },   // e.g. "Excellent", "Very Good"
    remark: { type: String, default: '' },
  },
  { _id: false }
);

const gradingScaleConfigSchema = new mongoose.Schema(
  {
    levelCategory: {
      type: String,
      enum: ['Nursery', 'KG', 'Primary', 'JHS'],
      required: true,
      unique: true,
    },
    scaleType: {
      type: String,
      enum: ['waec_9point', 'descriptive_band', 'percentage_only'],
      required: true,
    },
    bands: [bandSchema],
    caWeight: { type: Number, default: 30, min: 0, max: 100 },
    examWeight: { type: Number, default: 70, min: 0, max: 100 },
  },
  { timestamps: true }
);

/**
 * Seed default configs if not yet present.
 */
gradingScaleConfigSchema.statics.seedDefaults = async function () {
  const defaults = [
    {
      levelCategory: 'Nursery',
      scaleType: 'descriptive_band',
      caWeight: 30,
      examWeight: 70,
      bands: [
        { min: 80, max: 100, grade: 'EX', label: 'Excellent',         remark: 'Excellent performance' },
        { min: 60, max: 79,  grade: 'VG', label: 'Very Good',         remark: 'Very good performance' },
        { min: 40, max: 59,  grade: 'S',  label: 'Satisfactory',      remark: 'Satisfactory performance' },
        { min: 0,  max: 39,  grade: 'NI', label: 'Needs Improvement', remark: 'Needs improvement' },
      ],
    },
    {
      levelCategory: 'KG',
      scaleType: 'descriptive_band',
      caWeight: 30,
      examWeight: 70,
      bands: [
        { min: 80, max: 100, grade: 'EX', label: 'Excellent',         remark: 'Excellent performance' },
        { min: 60, max: 79,  grade: 'VG', label: 'Very Good',         remark: 'Very good performance' },
        { min: 40, max: 59,  grade: 'S',  label: 'Satisfactory',      remark: 'Satisfactory performance' },
        { min: 0,  max: 39,  grade: 'NI', label: 'Needs Improvement', remark: 'Needs improvement' },
      ],
    },
    {
      levelCategory: 'Primary',
      scaleType: 'descriptive_band',
      caWeight: 30,
      examWeight: 70,
      bands: [
        { min: 90, max: 100, grade: 'A', label: 'Excellent',         remark: 'Excellent' },
        { min: 80, max: 89,  grade: 'B', label: 'Very Good',         remark: 'Very Good' },
        { min: 70, max: 79,  grade: 'C', label: 'Good',              remark: 'Good' },
        { min: 60, max: 69,  grade: 'D', label: 'Satisfactory',      remark: 'Satisfactory' },
        { min: 50, max: 59,  grade: 'E', label: 'Pass',              remark: 'Pass' },
        { min: 0,  max: 49,  grade: 'F', label: 'Needs Improvement', remark: 'Needs Improvement' },
      ],
    },
    {
      levelCategory: 'JHS',
      scaleType: 'waec_9point',
      caWeight: 30,
      examWeight: 70,
      bands: [
        { min: 90, max: 100, grade: '1', label: 'Excellent',          remark: 'Excellent' },
        { min: 80, max: 89,  grade: '2', label: 'Very Good',          remark: 'Very Good' },
        { min: 70, max: 79,  grade: '3', label: 'Good',               remark: 'Good' },
        { min: 60, max: 69,  grade: '4', label: 'Credit',             remark: 'Credit' },
        { min: 55, max: 59,  grade: '5', label: 'Credit',             remark: 'Credit' },
        { min: 50, max: 54,  grade: '6', label: 'Pass',               remark: 'Pass' },
        { min: 45, max: 49,  grade: '7', label: 'Pass',               remark: 'Pass' },
        { min: 40, max: 44,  grade: '8', label: 'Pass',               remark: 'Pass' },
        { min: 0,  max: 39,  grade: '9', label: 'Fail',               remark: 'Fail' },
      ],
    },
  ];

  for (const config of defaults) {
    await this.findOneAndUpdate(
      { levelCategory: config.levelCategory },
      { $setOnInsert: config },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('GradingScaleConfig', gradingScaleConfigSchema);
