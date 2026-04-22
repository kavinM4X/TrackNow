import mongoose from 'mongoose';

const marketRateSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    enum: ['Ramanagara', 'Mamballi', 'Dharmapuri', 'Coimbatore']
  },
  date: {
    type: String,
    required: true
  },
  topRate: {
    type: Number,
    required: true,
    min: 0
  },
  avgRate: {
    type: Number,
    required: true,
    min: 0
  },
  minRate: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index on location and date
marketRateSchema.index({ location: 1, date: 1 }, { unique: true });

export default mongoose.model('MarketRate', marketRateSchema);
