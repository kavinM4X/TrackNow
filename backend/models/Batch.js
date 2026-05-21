const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  date: {
    type: String,
    required: true
  }, // YYYY-MM-DD
  location: {
    type: String,
    enum: ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri']
  },
  /** Sum of good + waste + doubles (kg) */
  totalWeightKg: {
    type: Number,
    required: true
  },
  goodSilkKg: {
    type: Number,
    required: true
  },
  /** @deprecated — same as goodSilkKg for charts */
  quantityKg: { type: Number },
  wasteKg: {
    type: Number,
    default: 0
  },
  doubles: {
    type: Number,
    default: 0
  },
  /** Manual ₹/kg per category */
  goodSilkRatePerKg: Number,
  wasteRatePerKg: Number,
  doublesRatePerKg: Number,
  goodSilkAmount: Number,
  wasteAmount: Number,
  doublesAmount: Number,
  /** Primary / legacy reference rate (often = good silk rate) */
  ratePerKg: Number,
  estimatedValue: Number,
  linkedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  notes: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  /** Shown on client dashboard / history only after admin saves pricing */
  visibleToClient: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
