const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    appliesToLevels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassLevel',
      },
    ],
    // "subject" for Primary/JHS, "strand" for KG thematic areas
    type: {
      type: String,
      enum: ['subject', 'strand'],
      default: 'subject',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subject', subjectSchema);
