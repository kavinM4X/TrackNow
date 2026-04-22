import mongoose from 'mongoose';

const trackerConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vehicleId: String,
  isEnabled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Moving', 'Idle', 'Stopped'],
    default: 'Stopped'
  },
  latitude: Number,
  longitude: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('TrackerConfig', trackerConfigSchema);
