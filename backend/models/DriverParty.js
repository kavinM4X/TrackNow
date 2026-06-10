const mongoose = require('mongoose');

const driverPartySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    village: { type: String, trim: true },
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driverName: { type: String, trim: true },
    city: {
      type: String,
      enum: ['Coimbatore', 'Ramnagar', 'Mamballi', 'Dharmapuri']
    },
    assignedDate: { type: String, trim: true },
    assignmentRentalAmount: { type: Number, default: 0 },
    goodRateOverride: Number,
    wasteRateOverride: Number,
    doubleRateOverride: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverParty', driverPartySchema);
