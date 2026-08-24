const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  userName: String,
  userRole: {
    type: String,
    enum: ['user', 'driver', 'staff', 'admin']
  },
  action: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['login','click','admin'], 
    required: true 
  },
  page: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for fast queries and automatic expiry of old logs
logSchema.index({ type: 1, timestamp: -1 });
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('Log', logSchema);
