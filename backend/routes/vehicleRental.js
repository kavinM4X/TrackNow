const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Batch = require('../models/Batch');
const VehicleRentalSession = require('../models/VehicleRentalSession');
const Log = require('../models/Log');
const {
  calcEffectiveRatePerKg,
  calcUserRentalEntry,
  summarizeSession
} = require('../utils/vehicleRentalCalc');
const { roundMoney } = require('../utils/batchCalc');
const { getClientPortalBase } = require('../utils/clientPortalBase');

function clientPortalBase() {
  return getClientPortalBase();
}

function sessionPayload(doc) {
  const s = doc.toObject ? doc.toObject() : doc;
  const summary = summarizeSession(s);
  return {
    ...s,
    ...summary,
    driverUrl: `${clientPortalBase()}/driver/rental/${s.token}`,
    expired: s.status === 'expired' || (s.expiresAt && new Date(s.expiresAt) < new Date()),
    locked: s.status === 'submitted'
  };
}

function assertSessionActive(session) {
  if (!session) return { status: 404, error: 'Link not found' };
  if (session.status === 'submitted') {
    return { status: 410, error: 'This entry was already submitted and cannot be edited' };
  }
  if (session.status === 'expired' || new Date(session.expiresAt) < new Date()) {
    return { status: 410, error: 'This link has expired' };
  }
  return null;
}

async function refreshSessionRates(session) {
  const rate = calcEffectiveRatePerKg(
    session.rentalAmount,
    session.totalSilkKg,
    session.manualRateExtra
  );
  session.effectiveRatePerKg = rate;
  for (const entry of session.entries) {
    if (!entry.completed) continue;
    const calc = calcUserRentalEntry(entry, rate);
    Object.assign(entry, calc);
  }
  return session;
}

// ——— Admin ———

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { date, location, vehicleOwnerName, rentalAmount, expiryHours, userIds } = req.body;
    if (!date || !vehicleOwnerName || rentalAmount == null) {
      return res.status(400).json({ error: 'Date, vehicle owner name, and rental amount are required' });
    }
    const hours = [6, 8, 10].includes(Number(expiryHours)) ? Number(expiryHours) : 8;
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Add at least one user' });
    }

    const users = await User.find({ _id: { $in: ids }, role: 'user' });
    if (users.length !== ids.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const token = crypto.randomBytes(12).toString('hex');

    const session = await VehicleRentalSession.create({
      date,
      location: location || 'Coimbatore',
      vehicleOwnerName: String(vehicleOwnerName).trim(),
      rentalAmount: Number(rentalAmount),
      expiryHours: hours,
      expiresAt,
      token,
      entries: users.map((u) => ({
        userId: u._id,
        userName: u.name,
        completed: false
      })),
      createdBy: req.user._id
    });

    await Log.create({
      userId: req.user._id,
      userName: req.user.name,
      action: `Vehicle rental link for ${vehicleOwnerName} (${users.length} users, ${hours}h)`,
      type: 'admin',
      page: 'batch-entry'
    });

    res.status(201).json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await VehicleRentalSession.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(sessions.map(sessionPayload));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const session = await VehicleRentalSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ——— Public driver (no login) ———

const publicRouter = express.Router();

publicRouter.get('/:token', async (req, res) => {
  try {
    const session = await VehicleRentalSession.findOne({ token: req.params.token });
    if (!session) return res.status(404).json({ error: 'Link not found' });

    if (session.status !== 'submitted' && new Date(session.expiresAt) < new Date()) {
      session.status = 'expired';
      await session.save();
    }

    if (session.status !== 'submitted' && new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This link has expired', expired: true });
    }

    res.json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

publicRouter.patch('/:token/settings', async (req, res) => {
  try {
    const session = await VehicleRentalSession.findOne({ token: req.params.token });
    const block = assertSessionActive(session);
    if (block) return res.status(block.status).json({ error: block.error });

    const { totalSilkKg, manualRateExtra } = req.body;
    if (totalSilkKg != null) session.totalSilkKg = Math.max(0, Number(totalSilkKg) || 0);
    if (manualRateExtra != null) session.manualRateExtra = Number(manualRateExtra) || 0;

    await refreshSessionRates(session);
    await session.save();
    res.json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

publicRouter.put('/:token/users/:userId', async (req, res) => {
  try {
    const session = await VehicleRentalSession.findOne({ token: req.params.token });
    const block = assertSessionActive(session);
    if (block) return res.status(block.status).json({ error: block.error });

    const entry = session.entries.find((e) => String(e.userId) === String(req.params.userId));
    if (!entry) return res.status(404).json({ error: 'User not in this session' });

    const {
      goodSilkKg,
      goodSilkRatePerKg,
      wasteKg,
      wasteRatePerKg,
      doublesKg,
      doublesRatePerKg
    } = req.body;

    if (goodSilkKg != null) entry.goodSilkKg = Number(goodSilkKg) || 0;
    if (goodSilkRatePerKg != null) entry.goodSilkRatePerKg = Number(goodSilkRatePerKg) || 0;
    if (wasteKg != null) entry.wasteKg = Number(wasteKg) || 0;
    if (wasteRatePerKg != null) entry.wasteRatePerKg = Number(wasteRatePerKg) || 0;
    if (doublesKg != null) entry.doublesKg = Number(doublesKg) || 0;
    if (doublesRatePerKg != null) entry.doublesRatePerKg = Number(doublesRatePerKg) || 0;

    if (entry.goodSilkKg <= 0) {
      return res.status(400).json({ error: 'Enter good silk kg' });
    }

    await refreshSessionRates(session);
    const rate = session.effectiveRatePerKg;
    const calc = calcUserRentalEntry(entry, rate);
    Object.assign(entry, calc, { completed: true });
    await session.save();

    res.json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

publicRouter.post('/:token/submit', async (req, res) => {
  try {
    const session = await VehicleRentalSession.findOne({ token: req.params.token });
    const block = assertSessionActive(session);
    if (block) return res.status(block.status).json({ error: block.error });

    if (!session.totalSilkKg || session.totalSilkKg <= 0) {
      return res.status(400).json({ error: 'Enter total silk kg for rental calculation' });
    }

    const incomplete = session.entries.filter((e) => !e.completed);
    if (incomplete.length > 0) {
      return res.status(400).json({
        error: `Complete all users before saving (${incomplete.length} pending)`
      });
    }

    await refreshSessionRates(session);
    const batchIds = [];
    const rate = session.effectiveRatePerKg;

    for (const entry of session.entries) {
      const user = await User.findById(entry.userId);
      if (!user) continue;

      const calc = calcUserRentalEntry(entry, rate);
      const good = Number(entry.goodSilkKg) || 0;
      const waste = Number(entry.wasteKg) || 0;
      const doubles = Number(entry.doublesKg) || 0;
      const totalKg = Math.round((good + waste + doubles) * 10) / 10;

      const batch = await Batch.create({
        userId: entry.userId,
        userName: user.name,
        date: session.date,
        location: session.location,
        totalWeightKg: totalKg,
        goodSilkKg: good,
        quantityKg: good,
        wasteKg: waste,
        doubles,
        goodSilkRatePerKg: entry.goodSilkRatePerKg,
        wasteRatePerKg: entry.wasteRatePerKg,
        doublesRatePerKg: entry.doublesRatePerKg,
        goodSilkAmount: calc.goodSilkAmount,
        wasteAmount: calc.wasteAmount,
        doublesAmount: calc.doublesAmount,
        ratePerKg: entry.goodSilkRatePerKg,
        estimatedValue: calc.finalAmount,
        updatedBy: session.createdBy,
        visibleToClient: true,
        notes: `Vehicle rental: ${session.vehicleOwnerName}`,
        vehicleRental: {
          sessionId: session._id,
          ownerName: session.vehicleOwnerName,
          ratePerKg: rate,
          rentalDeduction: calc.rentalAmount,
          netSilkValue: calc.netSilkValue,
          finalAmount: calc.finalAmount
        }
      });
      batchIds.push(batch._id);
    }

    session.status = 'submitted';
    session.submittedAt = new Date();
    session.batchIds = batchIds;
    await session.save();

    res.json(sessionPayload(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { adminRouter: router, publicRouter };
