const mongoose = require('mongoose');

const publicUserInviteLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    expiryHours: { type: Number, default: 18 },
    expiresAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublicUserInviteLink', publicUserInviteLinkSchema);
