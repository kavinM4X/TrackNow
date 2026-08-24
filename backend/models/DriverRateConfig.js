const mongoose = require('mongoose');

const driverRateConfigSchema = new mongoose.Schema(
  {
    goodRate: { type: Number, default: 600 },
    wasteRate: { type: Number, default: 300 },
    doubleRate: { type: Number, default: 450 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverRateConfig', driverRateConfigSchema);
