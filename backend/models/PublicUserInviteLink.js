const mongoose = require('mongoose');

const publicUserInviteLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublicUserInviteLink', publicUserInviteLinkSchema);
