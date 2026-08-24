const mongoose = require('mongoose');

const marketRateSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true, 
    unique: true 
  }, // YYYY-MM-DD
  coimbatore: Number,
  coimbatoreAvg: Number,
  coimbatoreMin: Number,
  mamballi: Number,
  mamballiAvg: Number,
  mamballiMin: Number,
  ramnagar: Number,
  ramnagarAvg: Number,
  ramnagarMin: Number,
  dharmapuri: Number,
  dharmapuriAvg: Number,
  dharmapuriMin: Number,
  topRate: Number,
  topMarket: String,
  minAvg: Number,
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

marketRateSchema.index({ date: -1 });

module.exports = mongoose.model('MarketRate', marketRateSchema);
