const mongoose = require('mongoose');

const driverPartySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    village: { type: String, trim: true },
    goodRateOverride: Number,
    wasteRateOverride: Number,
    doubleRateOverride: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverParty', driverPartySchema);
