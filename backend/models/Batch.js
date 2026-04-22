import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  totalKg: {
    type: Number,
    required: true,
    min: 0
  },
  wasteKg: {
    type: Number,
    default: 0
  },
  doubles: {
    type: Number,
    default: 0
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Batch', batchSchema);
