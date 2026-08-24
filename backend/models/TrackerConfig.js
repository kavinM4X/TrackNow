const mongoose = require('mongoose');

const trackerConfigSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    unique: true 
  },
  userName: String,
  vehicleId: String,
  isEnabled: { 
    type: Boolean, 
    default: false 
  },
  activatedAt: Date,
  activatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  lastUpdated: Date,
  /** Last GPS ping from client device */
  lastLatitude: Number,
  lastLongitude: Number,
  lastLocationAt: Date
}, { timestamps: true });

module.exports = mongoose.model('TrackerConfig', trackerConfigSchema);
