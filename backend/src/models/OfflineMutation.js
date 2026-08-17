const mongoose = require('mongoose');

const offlineMutationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    actorKey: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: String, enum: ['processing', 'completed'], default: 'processing' },
    responseStatus: { type: Number, default: null },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

offlineMutationSchema.index({ key: 1, actorKey: 1 }, { unique: true });
offlineMutationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('OfflineMutation', offlineMutationSchema);
