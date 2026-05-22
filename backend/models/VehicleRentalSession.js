const mongoose = require('mongoose');

const userEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
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

const vehicleRentalSessionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    location: {
      type: String,
      enum: ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'],
      default: 'Coimbatore'
    },
    vehicleOwnerName: { type: String, required: true },
    rentalAmount: { type: Number, required: true },
    expiryHours: { type: Number, enum: [6, 8, 10], default: 8 },
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'expired'],
      default: 'pending'
    },
    totalSilkKg: { type: Number, default: 0 },
    manualRateExtra: { type: Number, default: 0 },
    effectiveRatePerKg: { type: Number, default: 0 },
    entries: [userEntrySchema],
    submittedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('VehicleRentalSession', vehicleRentalSessionSchema);
