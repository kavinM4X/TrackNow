const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userName: String,
  date: { 
    type: String, 
    required: true 
  }, // YYYY-MM-DD
  location: { 
    type: String, 
    enum: ['Coimbatore','Mamballi','Ramnagar','Dharmapuri'] 
  },
  quantityKg: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  notes: String,
  adminNote: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'  }
}, { timestamps: true });

bookingSchema.index({ userId: 1, status: 1, date: 1 });
bookingSchema.index({ userId: 1, date: -1 });
bookingSchema.index({ status: 1, date: -1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
