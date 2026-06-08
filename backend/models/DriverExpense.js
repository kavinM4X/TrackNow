const mongoose = require('mongoose');

const driverExpenseSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverVehicle', required: true },
    category: {
      type: String,
      enum: ['diesel', 'food', 'loading', 'toll', 'repair', 'other'],
      default: 'other'
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverExpense', driverExpenseSchema);
