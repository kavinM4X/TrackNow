const mongoose = require('mongoose');

const driverAdvanceSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicle', required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi'], default: 'cash' },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverAdvance', driverAdvanceSchema);
