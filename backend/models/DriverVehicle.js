const mongoose = require('mongoose');

const driverVehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    driverName: { type: String, required: true, trim: true },
    driverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    city: {
      type: String,
      enum: ['Coimbatore', 'Ramnagar', 'Mamballi', 'Dharmapuri']
    },
    tripLeg: { type: String, enum: ['go', 'come'], default: 'go' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverVehicle', driverVehicleSchema);
