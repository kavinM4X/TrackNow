const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['in_flight', 'completed'],
      default: 'in_flight'
    },
    statusCode: Number,
    responseBody: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // 24 hours TTL auto-deletion by MongoDB
    }
  },
  { timestamps: true }
);

// Compound unique index ensuring atomic lock acquisition across all server instances
idempotencyKeySchema.index({ key: 1, userId: 1, method: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
