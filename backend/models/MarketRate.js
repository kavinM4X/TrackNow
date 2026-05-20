const mongoose = require('mongoose');

const marketRateSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true, 
    unique: true 
  }, // YYYY-MM-DD
  coimbatore: Number,
  coimbatoreAvg: Number,
  mamballi: Number,
  mamballiAvg: Number,
  ramnagar: Number,
  ramnagarAvg: Number,
  dharmapuri: Number,
  dharmapuriAvg: Number,
  topRate: Number,
  topMarket: String,
  minAvg: Number,
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('MarketRate', marketRateSchema);
