const express = require('express');
const crypto = require('crypto');
const { protect, adminOnly } = require('../middleware/auth');
const PublicUserInviteLink = require('../models/PublicUserInviteLink');
const Log = require('../models/Log');
const { createAppUser } = require('../utils/createAppUser');
const { getClientPortalBase } = require('../utils/clientPortalBase');

const adminRouter = express.Router();
const publicRouter = express.Router();

function clientPortalBase() {
  return getClientPortalBase();
}

function buildRegisterUrl(token) {
  return `${clientPortalBase()}/register/${token}`;
}

async function getActiveInvite() {
  return PublicUserInviteLink.findOne({ isActive: true }).sort({ createdAt: -1 });
}

async function findValidInvite(token) {
  if (!token) return null;
  return PublicUserInviteLink.findOne({ token, isActive: true });
}

// GET /api/admin/user-invite — current permanent registration link
adminRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const invite = await getActiveInvite();
    if (!invite) {
      return res.json({ hasLink: false });
    }
    res.json({
      hasLink: true,
      token: invite.token,
      registerUrl: buildRegisterUrl(invite.token),
      createdAt: invite.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/user-invite — create or regenerate (no expiry)
adminRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    await PublicUserInviteLink.updateMany({ isActive: true }, { isActive: false });

    const token = crypto.randomBytes(16).toString('hex');
    const invite = await PublicUserInviteLink.create({
      token,
      isActive: true,
      createdBy: req.user._id
    });

    await Log.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Generated public user registration link',
      type: 'admin',
      page: 'create-user'
    });

    res.status(201).json({
      hasLink: true,
      token: invite.token,
      registerUrl: buildRegisterUrl(invite.token),
      createdAt: invite.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/public/register-user/:token
publicRouter.get('/:token', async (req, res) => {
  try {
    const invite = await findValidInvite(req.params.token);
    if (!invite) {
      return res.status(404).json({ error: 'Registration link is invalid or disabled' });
    }
    res.json({
      valid: true,
      registerUrl: buildRegisterUrl(invite.token),
      noExpiry: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/public/register-user/:token
publicRouter.post('/:token', async (req, res) => {
  try {
    const invite = await findValidInvite(req.params.token);
    if (!invite) {
      return res.status(404).json({ error: 'Registration link is invalid or disabled' });
    }

    const { name, phone, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const result = await createAppUser({
      name,
      phone,
      email,
      password,
      role: 'user',
      trackerEnabled: false
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    await Log.create({
      userId: result.user._id,
      userName: result.user.name,
      action: `Self-registered via public link (${result.normalizedPhone})`,
      type: 'admin',
      page: 'public-register'
    });

    res.status(201).json({
      message: 'Account created successfully. You can log in with your phone and password.',
      userId: result.user._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { adminRouter, publicRouter };
