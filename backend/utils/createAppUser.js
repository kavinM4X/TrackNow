const User = require('../models/User');
const TrackerConfig = require('../models/TrackerConfig');
const { normalizePhone } = require('./phone');

async function createAppUser({
  name,
  phone,
  email,
  password,
  role = 'user',
  trackerEnabled = false,
  vehicleId = null,
  activatedBy = null
}) {
  const normalizedPhone = normalizePhone(phone);

  if (!name?.trim()) {
    return { error: 'Full name is required', status: 400 };
  }
  if (!normalizedPhone) {
    return { error: 'Phone is required', status: 400 };
  }
  if (!password || String(password).length < 6) {
    return { error: 'Password must be at least 6 characters', status: 400 };
  }

  const exists = await User.findOne({ phone: normalizedPhone });
  if (exists) {
    return { error: 'This phone number is already registered', status: 400 };
  }

  const allowed = ['user', 'admin', 'driver', 'staff'];
  const safeRole = allowed.includes(role) ? role : 'user';

  const user = await User.create({
    name: String(name).trim(),
    phone: normalizedPhone,
    email: email?.trim() || undefined,
    role: safeRole,
    password,
    isActive: true,
    trackerEnabled: Boolean(trackerEnabled),
    vehicleId: vehicleId || null
  });

  if (trackerEnabled && vehicleId) {
    await TrackerConfig.create({
      userId: user._id,
      userName: user.name,
      vehicleId,
      isEnabled: true,
      activatedAt: new Date(),
      activatedBy: activatedBy || user._id
    });
  }

  return { user, normalizedPhone };
}

module.exports = { createAppUser };
