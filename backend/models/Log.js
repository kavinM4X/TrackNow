const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  userName: String,
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

// Index for fast queries
logSchema.index({ type: 1, timestamp: -1 });
logSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
