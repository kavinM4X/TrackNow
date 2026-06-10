const mongoose = require('mongoose');

const partyEntrySchema = new mongoose.Schema(
  {
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverParty', required: true },
    partyName: String,
    phone: String,
    goodSilkKg: { type: Number, default: 0 },
    goodSilkRatePerKg: { type: Number, default: 0 },
    wasteKg: { type: Number, default: 0 },
    wasteRatePerKg: { type: Number, default: 0 },
    doublesKg: { type: Number, default: 0 },
    doublesRatePerKg: { type: Number, default: 0 },
    goodSilkAmount: Number,
    wasteAmount: Number,
    doublesAmount: Number,
    netSilkValue: Number,
    rentalAmount: Number,
    finalAmount: Number,
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const driverPartyBatchSchema = new mongoose.Schema(
  {
    driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverName: String,
    assignedDate: { type: String, required: true },
    city: {
      type: String,
      enum: ['Coimbatore', 'Ramnagar', 'Mamballi', 'Dharmapuri']
    },
    rentalAmount: { type: Number, default: 0 },
    totalSilkKg: { type: Number, default: 0 },
    manualRateExtra: { type: Number, default: 0 },
    effectiveRatePerKg: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'submitted'], default: 'pending' },
    entries: [partyEntrySchema],
    submittedAt: Date
  },
  { timestamps: true }
);

driverPartyBatchSchema.index({ driverUserId: 1, assignedDate: -1 });

module.exports = mongoose.model('DriverPartyBatch', driverPartyBatchSchema);
