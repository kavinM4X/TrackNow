const mongoose = require('mongoose');

const driverSilkEntrySchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicle', required: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverParty', required: true },
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: String, required: true },
    goodKg: { type: Number, default: 0 },
    goodRate: { type: Number, default: 0 },
    goodAmount: { type: Number, default: 0 },
    wasteKg: { type: Number, default: 0 },
    wasteRate: { type: Number, default: 0 },
    wasteAmount: { type: Number, default: 0 },
    doubleKg: { type: Number, default: 0 },
    doubleRate: { type: Number, default: 0 },
    doubleAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverSilkEntry', driverSilkEntrySchema);
