const express = require('express');
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const DriverVehicle = require('../models/DriverVehicle');
const DriverParty = require('../models/DriverParty');
const DriverAdvance = require('../models/DriverAdvance');
const DriverExpense = require('../models/DriverExpense');
const DriverSilkEntry = require('../models/DriverSilkEntry');
const DriverPartyBatch = require('../models/DriverPartyBatch');
const Batch = require('../models/Batch');
const DriverRateConfig = require('../models/DriverRateConfig');
const { enrichVehicle, getVehicleTotals } = require('../utils/driverBalance');
const { getGlobalRates, getRatesForParty, calcSilkAmounts } = require('../utils/driverRates');
const { normalizePhone, phonesMatch } = require('../utils/phone');
const {
  calcEffectiveRatePerKg,
  calcUserRentalEntry,
  summarizeSession
} = require('../utils/vehicleRentalCalc');

const adminRouter = express.Router();
const driverRouter = express.Router();

function driverOnly(req, res, next) {
  if (!['driver', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Driver access only' });
  }
  next();
}

function nameMatches(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** Only trips where admin selected this driver (driverUserId) in Vehicles. */
async function listDriverVehicleDocs(userId, _userName, { activeOnly = true } = {}) {
  const statusFilter = activeOnly ? { status: 'active' } : {};
  return DriverVehicle.find({ driverUserId: userId, ...statusFilter }).sort({ updatedAt: -1 });
}

async function listDriverVehicles(userId, userName) {
  const docs = await listDriverVehicleDocs(userId, userName);
  return Promise.all(docs.map(enrichVehicle));
}

async function resolveDriverVehicle(userId, vehicleId, userName, { activeOnly = true } = {}) {
  const allowed = await listDriverVehicleDocs(userId, userName, { activeOnly });
  if (vehicleId) {
    const v = allowed.find((x) => String(x._id) === String(vehicleId));
    return v || null;
  }
  return allowed[0] || null;
}

// ——— Admin: dashboard stats ———
adminRouter.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const vehicles = await DriverVehicle.find({ status: 'active' });
    let totalCash = 0;
    let totalAdvance = 0;
    let totalExpense = 0;
    for (const v of vehicles) {
      const t = await getVehicleTotals(v._id);
      totalCash += t.balance;
      totalAdvance += t.advanceTotal;
      totalExpense += t.expenseTotal;
    }
    const pendingEntries = await DriverSilkEntry.countDocuments({ status: 'pending' });
    res.json({ totalCash, totalAdvance, totalExpense, pendingEntries, vehicleCount: vehicles.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/driver-users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['driver', 'staff'] } })
      .sort({ name: 1 })
      .select('name phone role');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Vehicles ———
adminRouter.get('/vehicles', protect, adminOnly, async (req, res) => {
  try {
    const list = await DriverVehicle.find().sort({ vehicleNumber: 1 });
    const enriched = await Promise.all(list.map(enrichVehicle));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.post('/vehicles', protect, adminOnly, async (req, res) => {
  try {
    const {
      vehicleNumber,
      driverName,
      driverUserId,
      status,
      city,
      advanceAmount,
      paymentMethod,
      advanceDate
    } = req.body;
    const cities = ['Coimbatore', 'Ramnagar', 'Mamballi', 'Dharmapuri'];
    if (!city || !cities.includes(city)) {
      return res.status(400).json({ error: 'Valid city is required' });
    }
    const leg = req.body.tripLeg === 'come' ? 'come' : 'go';
    const v = await DriverVehicle.create({
      vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
      driverName: driverName?.trim(),
      driverUserId: driverUserId || null,
      city,
      tripLeg: leg,
      status: status || 'active'
    });
    const amt = Number(advanceAmount);
    if (amt > 0) {
      const method = paymentMethod === 'upi' ? 'upi' : 'cash';
      await DriverAdvance.create({
        vehicleId: v._id,
        amount: amt,
        date: advanceDate || new Date().toISOString().split('T')[0],
        paymentMethod: method,
        remarks: `Opening advance (${method.toUpperCase()})`,
        createdBy: req.user._id
      });
    }
    res.status(201).json(await enrichVehicle(v));
  } catch (e) {
    if (e.code === 11000 && String(e.message).includes('vehicleNumber')) {
      return res.status(409).json({
        error:
          'Vehicle number duplicate lock is still active. Restart the API once, then add the trip again (each trip gets its own ID).'
      });
    }
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put('/vehicles/:id', protect, adminOnly, async (req, res) => {
  try {
    const v = await DriverVehicle.findByIdAndUpdate(
      req.params.id,
      {
        vehicleNumber: req.body.vehicleNumber?.trim()?.toUpperCase(),
        driverName: req.body.driverName?.trim(),
        driverUserId: req.body.driverUserId || null,
        city: req.body.city,
        tripLeg: req.body.tripLeg === 'come' ? 'come' : 'go',
        status: req.body.status
      },
      { new: true }
    );
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json(await enrichVehicle(v));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/vehicles/:id/expenses', protect, adminOnly, async (req, res) => {
  try {
    const vehicle = await DriverVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    const expenses = await DriverExpense.find({ vehicleId: vehicle._id }).sort({
      date: -1,
      createdAt: -1
    });
    const totals = await getVehicleTotals(vehicle._id);
    res.json({ vehicle: await enrichVehicle(vehicle), expenses, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.post('/expenses', protect, adminOnly, async (req, res) => {
  try {
    const vehicle = await DriverVehicle.findById(req.body.vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Trip not found' });
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const expense = await DriverExpense.create({
      vehicleId: vehicle._id,
      category: req.body.category || 'other',
      amount,
      date: req.body.date || new Date().toISOString().split('T')[0],
      remarks: req.body.remarks,
      createdBy: req.user._id
    });
    res.status(201).json({ expense, vehicle: await enrichVehicle(vehicle) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put('/expenses/:id', protect, adminOnly, async (req, res) => {
  try {
    const expense = await DriverExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Not found' });
    if (req.body.category) expense.category = req.body.category;
    if (req.body.amount != null) expense.amount = Number(req.body.amount);
    if (req.body.date) expense.date = req.body.date;
    if (req.body.remarks !== undefined) expense.remarks = req.body.remarks;
    await expense.save();
    const vehicle = await DriverVehicle.findById(expense.vehicleId);
    res.json({ expense, vehicle: vehicle ? await enrichVehicle(vehicle) : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/vehicles/:id/ledger', protect, adminOnly, async (req, res) => {
  try {
    const vehicle = await DriverVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    const [advances, expenses] = await Promise.all([
      DriverAdvance.find({ vehicleId: vehicle._id }).sort({ date: -1, createdAt: -1 }),
      DriverExpense.find({ vehicleId: vehicle._id }).sort({ date: -1, createdAt: -1 })
    ]);
    const rows = [
      ...advances.map((a) => ({
        _id: a._id,
        date: a.date,
        type: a.paymentMethod ? `Advance (${a.paymentMethod.toUpperCase()})` : 'Advance',
        amount: a.amount,
        sign: 1,
        remarks: a.remarks,
        paymentMethod: a.paymentMethod,
        createdAt: a.createdAt
      })),
      ...expenses.map((e) => ({
        _id: e._id,
        date: e.date,
        type: e.category,
        amount: e.amount,
        sign: -1,
        remarks: e.remarks,
        createdAt: e.createdAt
      }))
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    const totals = await getVehicleTotals(vehicle._id);
    res.json({ vehicle, totals, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Advances ———
adminRouter.post('/advances', protect, adminOnly, async (req, res) => {
  try {
    const { vehicleId, amount, date, remarks, paymentMethod } = req.body;
    const advance = await DriverAdvance.create({
      vehicleId,
      amount: Number(amount),
      date,
      paymentMethod: paymentMethod === 'upi' ? 'upi' : 'cash',
      remarks,
      createdBy: req.user._id
    });
    const vehicle = await DriverVehicle.findById(vehicleId);
    res.status(201).json({ advance, vehicle: vehicle ? await enrichVehicle(vehicle) : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Parties ———
adminRouter.get('/client-users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user', isActive: true })
      .sort({ name: 1 })
      .select('name phone address farmDetails');

    res.json(
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        phone: u.phone,
        village: u.farmDetails?.farmLocation || u.address || ''
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/client-users/search', protect, adminOnly, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalized = normalizePhone(q);
    const or = [{ name: new RegExp(escaped, 'i') }];
    if (normalized.length >= 2) {
      or.push({ phone: normalized });
      or.push({ phone: new RegExp(normalized.replace(/\D/g, ''), 'i') });
    }

    const users = await User.find({ role: 'user', isActive: true, $or: or })
      .sort({ name: 1 })
      .limit(12)
      .select('name phone address farmDetails');

    res.json(
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        phone: u.phone,
        village: u.farmDetails?.farmLocation || u.address || ''
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/parties', protect, adminOnly, async (req, res) => {
  try {
    const parties = await DriverParty.find().sort({ name: 1 });
    const withMeta = await Promise.all(
      parties.map(async (p) => {
        const last = await DriverSilkEntry.findOne({ partyId: p._id }).sort({ date: -1 });
        const pending = await DriverSilkEntry.countDocuments({ partyId: p._id, status: 'pending' });
        return {
          ...p.toObject(),
          lastEntry: last,
          pendingCount: pending
        };
      })
    );
    res.json(withMeta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/party-batches', protect, adminOnly, async (req, res) => {
  try {
    await syncPartyBatchesFromParties();
    const batches = await DriverPartyBatch.find().sort({ assignedDate: -1, updatedAt: -1 });
    const rows = [];
    for (const batch of batches) {
      await hydrateBatchRental(batch);
      rows.push(batchPayload(batch));
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/party-batches/:id', protect, adminOnly, async (req, res) => {
  try {
    let batch = await DriverPartyBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    await hydrateBatchRental(batch);

    const partyFilter = {
      driverUserId: batch.driverUserId,
      assignedDate: batch.assignedDate
    };
    if (batch.city) partyFilter.city = batch.city;

    const parties = await DriverParty.find(partyFilter).sort({ name: 1 });

    const partyRows = parties.map((p) => {
      const obj = p.toObject();
      const entry = batch.entries.find((e) => String(e.partyId) === String(p._id));
      return { ...obj, batchEntry: entry || null };
    });

    res.json({ ...batchPayload(batch), parties: partyRows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function partyPayload(body) {
  return {
    name: body.name?.trim(),
    phone: body.phone ? normalizePhone(body.phone) : undefined,
    village: body.village?.trim(),
    clientUserId: body.clientUserId || null,
    driverUserId: body.driverUserId || null,
    driverName: body.driverName?.trim(),
    city: body.city || undefined,
    assignedDate: body.assignedDate?.trim() || undefined,
    goodRateOverride: body.goodRateOverride != null && body.goodRateOverride !== ''
      ? Number(body.goodRateOverride)
      : null,
    wasteRateOverride: body.wasteRateOverride != null && body.wasteRateOverride !== ''
      ? Number(body.wasteRateOverride)
      : null,
    doubleRateOverride: body.doubleRateOverride != null && body.doubleRateOverride !== ''
      ? Number(body.doubleRateOverride)
      : null
  };
}

async function findPartyBatch(driverUserId, assignedDate, city) {
  let batch = null;
  if (city) {
    batch = await DriverPartyBatch.findOne({ driverUserId, assignedDate, city });
  }
  if (!batch) {
    batch = await DriverPartyBatch.findOne({
      driverUserId,
      assignedDate,
      $or: [{ city: null }, { city: '' }, { city: { $exists: false } }]
    });
    if (batch && city) batch.city = city;
  }
  if (!batch) {
    batch = await DriverPartyBatch.findOne({ driverUserId, assignedDate });
    if (batch && city && !batch.city) batch.city = city;
  }
  return batch;
}

async function mergeDuplicateBatches(driverUserId, assignedDate, primary) {
  const others = await DriverPartyBatch.find({
    driverUserId,
    assignedDate,
    _id: { $ne: primary._id }
  });
  if (!others.length) return primary;

  for (const other of others) {
    for (const row of other.entries || []) {
      const exists = primary.entries.find((e) => String(e.partyId) === String(row.partyId));
      if (!exists) primary.entries.push(row);
    }
    if ((other.rentalAmount || 0) > (primary.rentalAmount || 0)) {
      primary.rentalAmount = other.rentalAmount;
    }
    if (!primary.city && other.city) primary.city = other.city;
    if (other.status === 'submitted' && primary.status !== 'submitted') {
      primary.status = other.status;
      primary.submittedAt = other.submittedAt;
    }
    await DriverPartyBatch.deleteOne({ _id: other._id });
  }
  await primary.save();
  return primary;
}

async function hydrateBatchRental(batch) {
  if ((batch.rentalAmount || 0) > 0 && batch.city) return batch;

  const parties = await DriverParty.find({
    driverUserId: batch.driverUserId,
    assignedDate: batch.assignedDate
  });
  let changed = false;

  if ((batch.rentalAmount || 0) <= 0) {
    let rental = parties.reduce((max, p) => {
      const r = Number(p.assignmentRentalAmount) || 0;
      return r > max ? r : max;
    }, 0);
    if (rental <= 0) {
      const sibling = await DriverPartyBatch.findOne({
        driverUserId: batch.driverUserId,
        assignedDate: batch.assignedDate,
        rentalAmount: { $gt: 0 }
      }).sort({ updatedAt: -1 });
      rental = Number(sibling?.rentalAmount) || 0;
    }
    if (rental > 0) {
      batch.rentalAmount = rental;
      changed = true;
    }
  }

  if (!batch.city) {
    const withCity = parties.find((p) => p.city);
    if (withCity?.city) {
      batch.city = withCity.city;
      changed = true;
    }
  }

  if (changed) await batch.save();
  return batch;
}

async function syncPartyBatchesFromParties(driverUserId = null) {
  const filter = {
    driverUserId: { $exists: true, $ne: null },
    assignedDate: { $exists: true, $ne: '' }
  };
  if (driverUserId) filter.driverUserId = driverUserId;

  const parties = await DriverParty.find(filter);
  const groups = new Map();

  for (const p of parties) {
    const key = `${String(p.driverUserId)}|${p.assignedDate}|${p.city || ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        driverUserId: p.driverUserId,
        driverName: p.driverName,
        assignedDate: p.assignedDate,
        city: p.city || undefined,
        parties: [],
        rentalAmount: 0
      });
    }
    const g = groups.get(key);
    g.parties.push(p);
    if (!g.driverName && p.driverName) g.driverName = p.driverName;
    const rental = Number(p.assignmentRentalAmount) || 0;
    if (rental > g.rentalAmount) g.rentalAmount = rental;
  }

  for (const g of groups.values()) {
    let batch = await findPartyBatch(g.driverUserId, g.assignedDate, g.city);
    const entryRows = g.parties.map((party) => ({
      partyId: party._id,
      partyName: party.name,
      phone: party.phone
    }));

    if (!batch) {
      batch = await DriverPartyBatch.create({
        driverUserId: g.driverUserId,
        driverName: g.driverName,
        assignedDate: g.assignedDate,
        city: g.city,
        rentalAmount: g.rentalAmount,
        entries: entryRows
      });
    } else {
      for (const row of entryRows) {
        const exists = batch.entries.find((e) => String(e.partyId) === String(row.partyId));
        if (!exists) batch.entries.push(row);
      }
      if (g.rentalAmount > 0) batch.rentalAmount = g.rentalAmount;
      if (g.city && !batch.city) batch.city = g.city;
      if (g.driverName) batch.driverName = g.driverName;
      await batch.save();
    }

    await mergeDuplicateBatches(g.driverUserId, g.assignedDate, batch);
  }
}

adminRouter.post('/parties/bulk', protect, adminOnly, async (req, res) => {
  try {
    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    if (userIds.length === 0) {
      return res.status(400).json({ error: 'Add at least one user' });
    }
    if (!req.body.driverUserId) {
      return res.status(400).json({ error: 'Select a driver' });
    }
    const cities = ['Coimbatore', 'Ramnagar', 'Mamballi', 'Dharmapuri'];
    const city = req.body.city || req.body.location;
    if (!city || !cities.includes(city)) {
      return res.status(400).json({ error: 'Valid market is required' });
    }

    const driver = await User.findById(req.body.driverUserId);
    if (!driver || !['driver', 'staff'].includes(driver.role)) {
      return res.status(400).json({ error: 'Invalid driver' });
    }

    const assignedDate =
      req.body.assignedDate?.trim() || new Date().toISOString().split('T')[0];

    const parties = [];
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user || user.role !== 'user') continue;

      const village = user.farmDetails?.farmLocation || user.address || '';
      const payload = {
        name: user.name,
        phone: normalizePhone(user.phone),
        village,
        clientUserId: user._id,
        driverUserId: driver._id,
        driverName: driver.name,
        city,
        assignedDate
      };

      let party = await DriverParty.findOne({ clientUserId: user._id, driverUserId: driver._id });
      if (!party) {
        party = await DriverParty.findOne({ clientUserId: user._id, driverUserId: null });
      }
      if (!party) {
        party = await DriverParty.findOne({
          phone: normalizePhone(user.phone),
          driverUserId: driver._id
        });
      }
      if (party) {
        Object.assign(party, payload);
        await party.save();
      } else {
        party = await DriverParty.create(payload);
      }
      parties.push(party);
    }

    if (parties.length === 0) {
      return res.status(400).json({ error: 'No valid users selected' });
    }

    const vehicleDoc = await resolveDriverVehicle(driver._id, null, driver.name);
    const advanceFallback = vehicleDoc ? (await enrichVehicle(vehicleDoc)).advanceTotal : 0;
    const rentalAmount =
      req.body.rentalAmount != null && req.body.rentalAmount !== ''
        ? Number(req.body.rentalAmount)
        : advanceFallback;
    if (!rentalAmount || rentalAmount <= 0) {
      return res.status(400).json({ error: 'Rental amount is required' });
    }

    for (const party of parties) {
      party.assignmentRentalAmount = rentalAmount;
      await party.save();
    }

    let batch = await findPartyBatch(driver._id, assignedDate, city);
    const entryRows = parties.map((p) => ({
      partyId: p._id,
      partyName: p.name,
      phone: p.phone
    }));
    if (!batch) {
      batch = await DriverPartyBatch.create({
        driverUserId: driver._id,
        driverName: driver.name,
        assignedDate,
        city,
        rentalAmount,
        entries: entryRows
      });
    } else {
      for (const row of entryRows) {
        const exists = batch.entries.find((e) => String(e.partyId) === String(row.partyId));
        if (!exists) batch.entries.push(row);
      }
      batch.rentalAmount = rentalAmount;
      batch.driverName = driver.name;
      if (batch.status !== 'submitted') {
        batch.totalSilkKg = 0;
        batch.manualRateExtra = 0;
        batch.effectiveRatePerKg = 0;
      }
      await batch.save();
    }

    batch = await mergeDuplicateBatches(driver._id, assignedDate, batch);

    res.status(201).json({ parties, batch, count: parties.length, assignedDate });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.post('/parties', protect, adminOnly, async (req, res) => {
  try {
    const party = await DriverParty.create(partyPayload(req.body));
    res.status(201).json(party);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put('/parties/:id', protect, adminOnly, async (req, res) => {
  try {
    const party = await DriverParty.findByIdAndUpdate(req.params.id, partyPayload(req.body), {
      new: true
    });
    if (!party) return res.status(404).json({ error: 'Not found' });
    res.json(party);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function resolveClientUserForParty(party) {
  if (!party) return null;

  const existingId = party.clientUserId?._id || party.clientUserId;
  if (existingId) {
    const user = await User.findOne({ _id: existingId, role: 'user' }).select('name phone');
    if (user) return user;
  }

  const phone = normalizePhone(party.phone);
  if (phone) {
    const byPhone = await User.find({ role: 'user' }).select('name phone');
    const user = byPhone.find((u) => phonesMatch(u.phone, phone));
    if (user) {
      if (party._id) {
        await DriverParty.findByIdAndUpdate(party._id, { clientUserId: user._id });
      }
      return user;
    }
  }

  if (party.name?.trim()) {
    const escaped = party.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = await User.find({
      role: 'user',
      name: { $regex: new RegExp(`^${escaped}$`, 'i') }
    }).select('name phone');
    const user =
      matches.length === 1
        ? matches[0]
        : matches.find((u) => phone && phonesMatch(u.phone, phone));
    if (user) {
      if (party._id) {
        await DriverParty.findByIdAndUpdate(party._id, { clientUserId: user._id });
      }
      return user;
    }
  }

  return null;
}

async function syncDriverEntryToClientBatch(entryId, reviewedBy, visible) {
  const full = await DriverSilkEntry.findById(entryId)
    .populate('partyId')
    .populate('vehicleId', 'driverName vehicleNumber');
  if (!full) return null;

  const party = full.partyId;
  let user = null;
  if (full.clientUserId) {
    user = await User.findOne({ _id: full.clientUserId, role: 'user' }).select('name phone');
  }
  if (!user) {
    user = await resolveClientUserForParty(party);
  }
  if (!user) return null;

  const clientUserId = user._id;
  if (!full.clientUserId || String(full.clientUserId) !== String(clientUserId)) {
    full.clientUserId = clientUserId;
    await full.save();
  }

  if (!visible) {
    await Batch.findOneAndUpdate({ driverSilkEntryId: full._id }, { visibleToClient: false });
    return null;
  }

  const good = Number(full.goodKg) || 0;
  const waste = Number(full.wasteKg) || 0;
  const doubles = Number(full.doubleKg) || 0;
  const totalKg = Math.round((good + waste + doubles) * 10) / 10;
  const goodAmount = Number(full.goodAmount) || 0;
  const wasteAmount = Number(full.wasteAmount) || 0;
  const doublesAmount = Number(full.doubleAmount) || 0;
  const netSilkValue = goodAmount - wasteAmount - doublesAmount;
  const finalAmount = Number(full.totalAmount) || 0;
  const rentalDeduction = Math.max(0, netSilkValue - finalAmount);
  const location = party.city || 'Coimbatore';
  const driverLabel = full.vehicleId?.driverName || party.driverName || 'driver';

  const batchPayload = {
    userId: new mongoose.Types.ObjectId(String(clientUserId)),
    userName: user.name,
    date: full.date,
    location,
    totalWeightKg: totalKg,
    goodSilkKg: good,
    quantityKg: good,
    wasteKg: waste,
    doubles,
    goodSilkRatePerKg: full.goodRate,
    wasteRatePerKg: full.wasteRate,
    doublesRatePerKg: full.doubleRate,
    goodSilkAmount: goodAmount,
    wasteAmount,
    doublesAmount,
    ratePerKg: full.goodRate,
    estimatedValue: finalAmount,
    updatedBy: reviewedBy,
    visibleToClient: true,
    notes: `Driver entry: ${driverLabel}`,
    driverSilkEntryId: full._id,
    vehicleRental: {
      ownerName: driverLabel,
      ratePerKg: good > 0 ? Math.round((rentalDeduction / good) * 100) / 100 : 0,
      rentalDeduction,
      netSilkValue,
      finalAmount
    }
  };

  let batch = await Batch.findOne({ driverSilkEntryId: full._id });
  if (batch) {
    batch.set(batchPayload);
    batch.markModified('vehicleRental');
    await batch.save();
  } else {
    batch = await Batch.create(batchPayload);
  }
  return { batch, userName: user.name, clientUserId: String(clientUserId) };
}

async function publishDriverEntryToClient(entryId, reviewedBy) {
  const result = await syncDriverEntryToClientBatch(entryId, reviewedBy, true);
  if (!result?.batch?._id) {
    const err = new Error(
      'Could not publish to client batch history. Check the party is linked to a client user with matching phone.'
    );
    err.statusCode = 400;
    throw err;
  }
  return result;
}

// ——— Silk entries (admin review) ———
adminRouter.get('/entries', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    let entries = await DriverSilkEntry.find(filter)
      .populate('vehicleId', 'vehicleNumber driverName')
      .populate('partyId', 'name phone village clientUserId')
      .populate('clientUserId', 'name')
      .populate('submittedBy', 'name')
      .sort({ createdAt: -1 });

    const approvedMissing = entries.filter((e) => e.status === 'approved');
    for (const entry of approvedMissing) {
      const linked = await Batch.exists({ driverSilkEntryId: entry._id, visibleToClient: true });
      if (!linked) {
        try {
          await publishDriverEntryToClient(entry._id, req.user._id);
        } catch (err) {
          console.error('Auto-publish driver entry failed:', entry._id, err.message);
        }
      }
    }
    if (approvedMissing.some((e) => !e.clientUserId)) {
      entries = await DriverSilkEntry.find(filter)
        .populate('vehicleId', 'vehicleNumber driverName')
        .populate('partyId', 'name phone village clientUserId')
        .populate('clientUserId', 'name')
        .populate('submittedBy', 'name')
        .sort({ createdAt: -1 });
    }
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.patch('/entries/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await DriverSilkEntry.findById(req.params.id).populate('partyId');
    if (!existing) return res.status(404).json({ error: 'Not found' });

    if (status === 'approved') {
      let clientUser = null;
      if (existing.clientUserId) {
        clientUser = await User.findOne({ _id: existing.clientUserId, role: 'user' }).select('name');
      }
      if (!clientUser) {
        clientUser = await resolveClientUserForParty(existing.partyId);
      }
      if (!clientUser) {
        return res.status(400).json({
          error:
            'Could not link this party to a client user. Add the user again from Admin → Driver → Parties → Add.'
        });
      }
    }

    const entry = await DriverSilkEntry.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote, reviewedBy: req.user._id },
      { new: true }
    )
      .populate('vehicleId', 'vehicleNumber driverName')
      .populate('partyId', 'name phone clientUserId');

    let clientBatch = null;
    if (status === 'approved') {
      clientBatch = await publishDriverEntryToClient(entry._id, req.user._id);
    } else if (status === 'rejected') {
      await syncDriverEntryToClientBatch(entry._id, req.user._id, false);
    }

    res.json({
      ...entry.toObject(),
      clientBatchId: clientBatch?.batch?._id || null,
      clientUserId: clientBatch?.clientUserId || null,
      clientUserName: clientBatch?.userName || null
    });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

adminRouter.post('/entries/:id/publish', protect, adminOnly, async (req, res) => {
  try {
    const entry = await DriverSilkEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (entry.status !== 'approved') {
      return res.status(400).json({ error: 'Approve the entry before publishing to client' });
    }
    const result = await publishDriverEntryToClient(entry._id, req.user._id);
    res.json({
      ok: true,
      clientBatchId: result.batch._id,
      clientUserId: result.clientUserId,
      clientUserName: result.userName,
      batchDate: result.batch.date,
      batchLocation: result.batch.location
    });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

// ——— Rates ———
adminRouter.get('/rates', protect, adminOnly, async (req, res) => {
  try {
    const partyId = req.query.partyId;
    res.json(partyId ? await getRatesForParty(partyId) : await getGlobalRates());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put('/party-batches/:id/parties/:partyId', protect, adminOnly, async (req, res) => {
  try {
    const batch = await DriverPartyBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    await hydrateBatchRental(batch);
    await updateBatchPartyEntry(batch, req.params.partyId, req.body);
    res.json(batchPayload(batch));
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

adminRouter.put('/rates', protect, adminOnly, async (req, res) => {
  try {
    const config = await getGlobalRates();
    config.goodRate = Number(req.body.goodRate) ?? config.goodRate;
    config.wasteRate = Number(req.body.wasteRate) ?? config.wasteRate;
    config.doubleRate = Number(req.body.doubleRate) ?? config.doubleRate;
    config.updatedBy = req.user._id;
    await config.save();
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Reports ———
adminRouter.get('/reports/daily', protect, adminOnly, async (req, res) => {
  try {
    const date = req.query.date;
    const filter = date ? { date } : {};
    const entries = await DriverSilkEntry.find({ ...filter, status: 'approved' }).populate(
      'vehicleId',
      'driverName'
    );
    const expenses = await DriverExpense.find(filter);
    const totalCollected = entries.reduce((s, e) => s + (e.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const byDriver = {};
    entries.forEach((e) => {
      const name = e.vehicleId?.driverName || 'Unknown';
      byDriver[name] = (byDriver[name] || 0) + (e.totalAmount || 0);
    });
    res.json({
      date: date || 'all',
      totalCollected,
      totalExpenses,
      net: totalCollected - totalExpenses,
      byDriver
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Driver app routes ———
driverRouter.get('/vehicles', protect, driverOnly, async (req, res) => {
  try {
    const vehicles = await listDriverVehicles(req.user._id, req.user.name);
    res.json(vehicles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/vehicles/:id', protect, driverOnly, async (req, res) => {
  try {
    const vehicle = await resolveDriverVehicle(req.user._id, req.params.id, req.user.name);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(await enrichVehicle(vehicle));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/vehicles/:id/expenses', protect, driverOnly, async (req, res) => {
  try {
    const vehicle = await resolveDriverVehicle(req.user._id, req.params.id, req.user.name);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    const expenses = await DriverExpense.find({ vehicleId: vehicle._id }).sort({
      date: -1,
      createdAt: -1
    });
    const totals = await getVehicleTotals(vehicle._id);
    res.json({ vehicle: await enrichVehicle(vehicle), expenses, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.put('/expenses/:id', protect, driverOnly, async (req, res) => {
  try {
    const expense = await DriverExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Not found' });
    const vehicle = await resolveDriverVehicle(req.user._id, expense.vehicleId, req.user.name);
    if (!vehicle) return res.status(403).json({ error: 'Not allowed' });
    if (req.body.category) expense.category = req.body.category;
    if (req.body.amount != null) expense.amount = Number(req.body.amount);
    if (req.body.date) expense.date = req.body.date;
    if (req.body.remarks !== undefined) expense.remarks = req.body.remarks;
    await expense.save();
    res.json({ expense, vehicle: await enrichVehicle(vehicle) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/me', protect, driverOnly, async (req, res) => {
  try {
    const vehicles = await listDriverVehicles(req.user._id, req.user.name);
    const vehicle = vehicles[0] || null;
    if (!vehicle) {
      return res.json({ user: req.user, vehicle: null, vehicles: [], noVehicle: true });
    }
    res.json({ user: req.user, vehicle, vehicles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/history', protect, driverOnly, async (req, res) => {
  try {
    const docs = await listDriverVehicleDocs(req.user._id, req.user.name, { activeOnly: false });
    const trips = await Promise.all(
      docs.map(async (v) => {
        const totals = await getVehicleTotals(v._id);
        const expenseCount = await DriverExpense.countDocuments({ vehicleId: v._id });
        const firstAdvance = await DriverAdvance.findOne({ vehicleId: v._id }).sort({ date: 1, createdAt: 1 });
        const obj = v.toObject();
        return {
          ...obj,
          ...totals,
          expenseCount,
          tripDate: firstAdvance?.date || obj.createdAt?.toISOString?.()?.split('T')[0] || null
        };
      })
    );
    trips.sort((a, b) => {
      const da = a.tripDate || '';
      const db = b.tripDate || '';
      if (da !== db) return db.localeCompare(da);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    res.json(trips);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/history/:id', protect, driverOnly, async (req, res) => {
  try {
    const vehicle = await resolveDriverVehicle(req.user._id, req.params.id, req.user.name, {
      activeOnly: false
    });
    if (!vehicle) return res.status(404).json({ error: 'Trip not found' });
    const expenses = await DriverExpense.find({ vehicleId: vehicle._id }).sort({
      date: -1,
      createdAt: -1
    });
    const advances = await DriverAdvance.find({ vehicleId: vehicle._id }).sort({ date: 1, createdAt: 1 });
    const totals = await getVehicleTotals(vehicle._id);
    const enriched = await enrichVehicle(vehicle);
    res.json({
      vehicle: enriched,
      expenses,
      advances,
      totals,
      tripDate: advances[0]?.date || enriched.createdAt?.toISOString?.()?.split('T')[0] || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/dashboard', protect, driverOnly, async (req, res) => {
  try {
    const vehicles = await listDriverVehicles(req.user._id, req.user.name);
    if (!vehicles.length) {
      return res.json({
        vehicle: null,
        vehicles: [],
        noVehicle: true,
        todaySpent: 0,
        pendingCount: 0,
        recentExpenses: [],
        recentEntries: []
      });
    }
    const enriched = vehicles[0];
    const vehicle = await DriverVehicle.findById(enriched._id);
    const today = new Date().toISOString().split('T')[0];
    const [todayExpenses, pendingCount, recentExpenses, recentEntries] = await Promise.all([
      DriverExpense.aggregate([
        { $match: { vehicleId: vehicle._id, date: today } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      DriverSilkEntry.countDocuments({ vehicleId: vehicle._id, status: 'pending' }),
      DriverExpense.find({ vehicleId: vehicle._id }).sort({ createdAt: -1 }).limit(5),
      DriverSilkEntry.find({ vehicleId: vehicle._id })
        .populate('partyId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);
    res.json({
      vehicle: enriched,
      vehicles,
      todaySpent: todayExpenses[0]?.total || 0,
      pendingCount,
      recentExpenses,
      recentEntries
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function batchPayload(doc) {
  const b = doc.toObject ? doc.toObject() : doc;
  const summary = summarizeSession({
    rentalAmount: b.rentalAmount,
    totalSilkKg: b.totalSilkKg,
    manualRateExtra: b.manualRateExtra,
    effectiveRatePerKg: b.effectiveRatePerKg,
    entries: b.entries
  });
  return {
    ...b,
    ...summary,
    userCount: b.entries?.length || 0,
    locked: b.status === 'submitted'
  };
}

async function refreshBatchRates(batch) {
  const rate = calcEffectiveRatePerKg(
    batch.rentalAmount,
    batch.totalSilkKg,
    batch.manualRateExtra
  );
  batch.effectiveRatePerKg = rate;
  for (const entry of batch.entries) {
    if (entry.completed) {
      Object.assign(entry, calcUserRentalEntry(entry, rate));
    }
  }
  return batch;
}

async function updateBatchPartyEntry(batch, partyId, body) {
  const entry = batch.entries.find((e) => String(e.partyId) === String(partyId));
  if (!entry) {
    const err = new Error('User not in this batch');
    err.statusCode = 404;
    throw err;
  }

  const defaults = await getRatesForParty(entry.partyId);
  const {
    goodSilkKg,
    goodSilkRatePerKg,
    wasteKg,
    wasteRatePerKg,
    doublesKg,
    doublesRatePerKg
  } = body;

  if (goodSilkKg != null) entry.goodSilkKg = Number(goodSilkKg) || 0;
  if (goodSilkRatePerKg != null) entry.goodSilkRatePerKg = Number(goodSilkRatePerKg) || 0;
  else if (!entry.goodSilkRatePerKg) entry.goodSilkRatePerKg = defaults.goodRate || 0;
  if (wasteKg != null) entry.wasteKg = Number(wasteKg) || 0;
  if (wasteRatePerKg != null) entry.wasteRatePerKg = Number(wasteRatePerKg) || 0;
  else if (!entry.wasteRatePerKg) entry.wasteRatePerKg = defaults.wasteRate || 0;
  if (doublesKg != null) entry.doublesKg = Number(doublesKg) || 0;
  if (doublesRatePerKg != null) entry.doublesRatePerKg = Number(doublesRatePerKg) || 0;
  else if (!entry.doublesRatePerKg) entry.doublesRatePerKg = defaults.doubleRate || 0;

  if (entry.goodSilkKg <= 0) {
    const err = new Error('Enter good silk kg');
    err.statusCode = 400;
    throw err;
  }

  await refreshBatchRates(batch);
  const rate = batch.effectiveRatePerKg;
  Object.assign(entry, calcUserRentalEntry(entry, rate), { completed: true });
  await batch.save();
  return batch;
}

async function ensureBatchesForDriver(userId, userName) {
  await syncPartyBatchesFromParties(userId);
  const batches = await DriverPartyBatch.find({ driverUserId: userId });
  for (const batch of batches) {
    if (!batch.driverName && userName) {
      batch.driverName = userName;
      await batch.save();
    }
    await hydrateBatchRental(batch);
  }
}

driverRouter.get('/party-batches', protect, driverOnly, async (req, res) => {
  try {
    await ensureBatchesForDriver(req.user._id, req.user.name);
    const batches = await DriverPartyBatch.find({ driverUserId: req.user._id }).sort({
      assignedDate: -1,
      updatedAt: -1
    });
    res.json(batches.map(batchPayload));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/party-batches/:id', protect, driverOnly, async (req, res) => {
  try {
    await ensureBatchesForDriver(req.user._id, req.user.name);
    let batch = await DriverPartyBatch.findOne({
      _id: req.params.id,
      driverUserId: req.user._id
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    await hydrateBatchRental(batch);
    res.json(batchPayload(batch));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.patch('/party-batches/:id/settings', protect, driverOnly, async (req, res) => {
  try {
    const batch = await DriverPartyBatch.findOne({
      _id: req.params.id,
      driverUserId: req.user._id
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'submitted') {
      return res.status(410).json({ error: 'This entry was already submitted' });
    }
    if (req.body.totalSilkKg != null) batch.totalSilkKg = Number(req.body.totalSilkKg) || 0;
    if (req.body.manualRateExtra != null) {
      batch.manualRateExtra = Number(req.body.manualRateExtra) || 0;
    }
    if (req.body.rentalAmount != null) batch.rentalAmount = Number(req.body.rentalAmount) || 0;
    await refreshBatchRates(batch);
    await batch.save();
    res.json(batchPayload(batch));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.put('/party-batches/:id/parties/:partyId', protect, driverOnly, async (req, res) => {
  try {
    const batch = await DriverPartyBatch.findOne({
      _id: req.params.id,
      driverUserId: req.user._id
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'submitted') {
      return res.status(410).json({ error: 'This entry was already submitted' });
    }
    await updateBatchPartyEntry(batch, req.params.partyId, req.body);
    res.json(batchPayload(batch));
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

driverRouter.post('/party-batches/:id/submit', protect, driverOnly, async (req, res) => {
  try {
    const batch = await DriverPartyBatch.findOne({
      _id: req.params.id,
      driverUserId: req.user._id
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'submitted') {
      return res.status(410).json({ error: 'Already submitted' });
    }
    if (!batch.totalSilkKg || batch.totalSilkKg <= 0) {
      return res.status(400).json({ error: 'Enter total silk kg for rental calculation' });
    }
    const incomplete = batch.entries.filter((e) => !e.completed);
    if (incomplete.length > 0) {
      return res.status(400).json({
        error: `Complete all users before saving (${incomplete.length} pending)`
      });
    }

    const vehicle = await resolveDriverVehicle(req.user._id, null, req.user.name);
    if (!vehicle) {
      return res.status(400).json({ error: 'No vehicle assigned for silk entries' });
    }

    await refreshBatchRates(batch);
    const rate = batch.effectiveRatePerKg;

    for (const entry of batch.entries) {
      const calc = calcUserRentalEntry(entry, rate);
      const partyDoc = await DriverParty.findById(entry.partyId).select('clientUserId phone name');
      const linkedClient = partyDoc ? await resolveClientUserForParty(partyDoc) : null;
      const existing = await DriverSilkEntry.findOne({
        partyId: entry.partyId,
        vehicleId: vehicle._id,
        date: batch.assignedDate
      });
      const payload = {
        vehicleId: vehicle._id,
        partyId: entry.partyId,
        clientUserId: linkedClient?._id || partyDoc?.clientUserId || null,
        date: batch.assignedDate,
        goodKg: entry.goodSilkKg,
        goodRate: entry.goodSilkRatePerKg,
        goodAmount: calc.goodSilkAmount,
        wasteKg: entry.wasteKg,
        wasteRate: entry.wasteRatePerKg,
        wasteAmount: calc.wasteAmount,
        doubleKg: entry.doublesKg,
        doubleRate: entry.doublesRatePerKg,
        doubleAmount: calc.doublesAmount,
        totalAmount: calc.finalAmount,
        status: 'pending',
        submittedBy: req.user._id
      };
      if (existing) {
        Object.assign(existing, payload);
        await existing.save();
      } else {
        await DriverSilkEntry.create(payload);
      }
    }

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    await batch.save();
    res.json(batchPayload(batch));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/parties', protect, driverOnly, async (req, res) => {
  try {
    const parties = await DriverParty.find({
      $or: [{ driverUserId: req.user._id }, { driverUserId: null }, { driverUserId: { $exists: false } }]
    }).sort({ name: 1 });
    const withMeta = await Promise.all(
      parties.map(async (p) => {
        const last = await DriverSilkEntry.findOne({ partyId: p._id }).sort({ date: -1 });
        const pending = await DriverSilkEntry.countDocuments({ partyId: p._id, status: 'pending' });
        return { ...p.toObject(), lastEntry: last, pendingCount: pending };
      })
    );
    res.json(withMeta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.get('/rates', protect, driverOnly, async (req, res) => {
  try {
    const partyId = req.query.partyId;
    res.json(await getRatesForParty(partyId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.post('/expenses', protect, driverOnly, async (req, res) => {
  try {
    const vehicle = await resolveDriverVehicle(req.user._id, req.body.vehicleId, req.user.name);
    if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });
    const expense = await DriverExpense.create({
      vehicleId: vehicle._id,
      category: req.body.category || 'other',
      amount: Number(req.body.amount),
      date: req.body.date,
      remarks: req.body.remarks,
      createdBy: req.user._id
    });
    res.status(201).json({ expense, vehicle: await enrichVehicle(vehicle) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

driverRouter.post('/entries', protect, driverOnly, async (req, res) => {
  try {
    const vehicle = await resolveDriverVehicle(req.user._id, req.body.vehicleId, req.user.name);
    if (!vehicle) return res.status(404).json({ error: 'No vehicle assigned' });
    const rates = await getRatesForParty(req.body.partyId);
    const amounts = calcSilkAmounts({
      goodKg: req.body.goodKg,
      wasteKg: req.body.wasteKg,
      doubleKg: req.body.doubleKg,
      ...rates
    });
    const entry = await DriverSilkEntry.create({
      vehicleId: vehicle._id,
      partyId: req.body.partyId,
      date: req.body.date,
      goodKg: Number(req.body.goodKg) || 0,
      wasteKg: Number(req.body.wasteKg) || 0,
      doubleKg: Number(req.body.doubleKg) || 0,
      goodRate: rates.goodRate,
      wasteRate: rates.wasteRate,
      doubleRate: rates.doubleRate,
      ...amounts,
      status: 'pending',
      submittedBy: req.user._id
    });
    res.status(201).json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { adminRouter, driverRouter };
