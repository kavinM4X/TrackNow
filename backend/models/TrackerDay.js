const mongoose = require('mongoose');

/** Per-day tracker assignment tied to client booking dates */
const trackerDaySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  date: {
    type: String,
    required: true
  }, // YYYY-MM-DD — booking date from client
  activeUntil: String, // YYYY-MM-DD — last day tracker stays on (booking date + 1)
  vehicleId: String,
  isEnabled: {
    type: Boolean,
    default: false
  },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  activatedAt: Date,
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  autoDisabledAt: Date,
  lastUpdated: Date
}, { timestamps: true });

trackerDaySchema.index({ userId: 1, date: 1 }, { unique: true });
trackerDaySchema.index({ date: 1, isEnabled: 1 });
trackerDaySchema.index({ activeUntil: 1, isEnabled: 1 });

module.exports = mongoose.model('TrackerDay', trackerDaySchema);
