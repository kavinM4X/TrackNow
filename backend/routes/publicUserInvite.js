const express = require('express');
const crypto = require('crypto');
const { protect, adminOnly } = require('../middleware/auth');
const PublicUserInviteLink = require('../models/PublicUserInviteLink');
const Log = require('../models/Log');
const { createAppUser } = require('../utils/createAppUser');
const { getClientPortalBase } = require('../utils/clientPortalBase');

const REGISTRATION_LINK_EXPIRY_HOURS = 18;

const adminRouter = express.Router();
const publicRouter = express.Router();

function clientPortalBase() {
  return getClientPortalBase();
}

function buildRegisterUrl(token) {
  return `${clientPortalBase()}/register/${token}`;
}

function getExpiresAt(invite) {
  if (invite.expiresAt) return new Date(invite.expiresAt);
  if (invite.createdAt) {
    const hours = invite.expiryHours || REGISTRATION_LINK_EXPIRY_HOURS;
    return new Date(invite.createdAt.getTime() + hours * 60 * 60 * 1000);
  }
  return new Date(0);
}

function isInviteExpired(invite) {
  return getExpiresAt(invite) < new Date();
}

function invitePayload(invite) {
  const expiresAt = getExpiresAt(invite);
  const expired = expiresAt < new Date();
  return {
    hasLink: true,
    token: invite.token,
    registerUrl: buildRegisterUrl(invite.token),
    createdAt: invite.createdAt,
    expiryHours: invite.expiryHours || REGISTRATION_LINK_EXPIRY_HOURS,
    expiresAt,
    expired
  };
}

async function getActiveInvite() {
  return PublicUserInviteLink.findOne({ isActive: true }).sort({ createdAt: -1 });
}

async function findValidInvite(token) {
  if (!token) return null;
  const invite = await PublicUserInviteLink.findOne({ token, isActive: true });
  if (!invite || isInviteExpired(invite)) return null;
  return invite;
}

// GET /api/admin/user-invite — current registration link
adminRouter.get('/', protect, adminOnly, async (req, res) => {
  try {
    const invite = await getActiveInvite();
    if (!invite) {
      return res.json({ hasLink: false });
    }
    res.json(invitePayload(invite));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/user-invite — create or regenerate (18h expiry)
adminRouter.post('/', protect, adminOnly, async (req, res) => {
  try {
    await PublicUserInviteLink.updateMany({ isActive: true }, { isActive: false });

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(
      Date.now() + REGISTRATION_LINK_EXPIRY_HOURS * 60 * 60 * 1000
    );
    const invite = await PublicUserInviteLink.create({
      token,
      isActive: true,
      expiryHours: REGISTRATION_LINK_EXPIRY_HOURS,
      expiresAt,
      createdBy: req.user._id
    });

    await Log.create({
      userId: req.user._id,
      userName: req.user.name,
      action: `Generated public user registration link (${REGISTRATION_LINK_EXPIRY_HOURS}h expiry)`,
      type: 'admin',
      page: 'create-user'
    });

    res.status(201).json(invitePayload(invite));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/public/register-user/:token
publicRouter.get('/:token', async (req, res) => {
  try {
    const invite = await PublicUserInviteLink.findOne({
      token: req.params.token,
      isActive: true
    });
    if (!invite) {
      return res.status(404).json({ error: 'Registration link is invalid or disabled' });
    }
    if (isInviteExpired(invite)) {
      return res.status(410).json({
        error: 'This registration link has expired',
        expired: true
      });
    }
    const expiresAt = getExpiresAt(invite);
    res.json({
      valid: true,
      registerUrl: buildRegisterUrl(invite.token),
      expiryHours: invite.expiryHours || REGISTRATION_LINK_EXPIRY_HOURS,
      expiresAt
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
      const stale = await PublicUserInviteLink.findOne({
        token: req.params.token,
        isActive: true
      });
      if (stale && isInviteExpired(stale)) {
        return res.status(410).json({ error: 'This registration link has expired', expired: true });
      }
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
