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
const DriverRateConfig = require('../models/DriverRateConfig');
const { enrichVehicle, getVehicleTotals } = require('../utils/driverBalance');
const { getGlobalRates, getRatesForParty, calcSilkAmounts } = require('../utils/driverRates');
const { normalizePhone } = require('../utils/phone');
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
    const batches = await DriverPartyBatch.find().sort({ assignedDate: -1, updatedAt: -1 });
    res.json(batches.map(batchPayload));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.get('/party-batches/:id', protect, adminOnly, async (req, res) => {
  try {
    const batch = await DriverPartyBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const parties = await DriverParty.find({
      driverUserId: batch.driverUserId,
      assignedDate: batch.assignedDate,
      city: batch.city
    }).sort({ name: 1 });

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
  let batch = await DriverPartyBatch.findOne({ driverUserId, assignedDate, city });
  if (!batch && city) {
    batch = await DriverPartyBatch.findOne({
      driverUserId,
      assignedDate,
      $or: [{ city: null }, { city: '' }, { city: { $exists: false } }]
    });
    if (batch) batch.city = city;
  }
  return batch;
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

// ——— Silk entries (admin review) ———
adminRouter.get('/entries', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const entries = await DriverSilkEntry.find(filter)
      .populate('vehicleId', 'vehicleNumber driverName')
      .populate('partyId', 'name phone village')
      .populate('submittedBy', 'name')
      .sort({ createdAt: -1 });
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
    const entry = await DriverSilkEntry.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote, reviewedBy: req.user._id },
      { new: true }
    )
      .populate('vehicleId', 'vehicleNumber driverName')
      .populate('partyId', 'name');
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ——— Rates ———
adminRouter.get('/rates', protect, adminOnly, async (req, res) => {
  try {
    res.json(await getGlobalRates());
  } catch (e) {
    res.status(500).json({ error: e.message });
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

async function ensureBatchesForDriver(userId, userName) {
  const parties = await DriverParty.find({
    driverUserId: userId,
    assignedDate: { $exists: true, $ne: '' }
  });
  const groups = new Map();
  for (const p of parties) {
    const key = `${p.assignedDate}|${p.city || ''}`;
    if (!groups.has(key)) {
      groups.set(key, { assignedDate: p.assignedDate, city: p.city, parties: [] });
    }
    groups.get(key).parties.push(p);
  }
  for (const { assignedDate, city, parties: list } of groups.values()) {
    let batch = await findPartyBatch(userId, assignedDate, city);
    if (!batch) {
      batch = await DriverPartyBatch.create({
        driverUserId: userId,
        driverName: userName,
        assignedDate,
        city,
        rentalAmount: 0,
        entries: list.map((p) => ({
          partyId: p._id,
          partyName: p.name,
          phone: p.phone
        }))
      });
    } else {
      let changed = false;
      for (const p of list) {
        if (!batch.entries.find((e) => String(e.partyId) === String(p._id))) {
          batch.entries.push({ partyId: p._id, partyName: p.name, phone: p.phone });
          changed = true;
        }
      }
      if (changed) await batch.save();
    }
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
    const batch = await DriverPartyBatch.findOne({
      _id: req.params.id,
      driverUserId: req.user._id
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
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

    const entry = batch.entries.find((e) => String(e.partyId) === String(req.params.partyId));
    if (!entry) return res.status(404).json({ error: 'User not in this batch' });

    const defaults = await getRatesForParty(entry.partyId);
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
    else if (!entry.goodSilkRatePerKg) entry.goodSilkRatePerKg = defaults.goodRate || 0;
    if (wasteKg != null) entry.wasteKg = Number(wasteKg) || 0;
    if (wasteRatePerKg != null) entry.wasteRatePerKg = Number(wasteRatePerKg) || 0;
    else if (!entry.wasteRatePerKg) entry.wasteRatePerKg = defaults.wasteRate || 0;
    if (doublesKg != null) entry.doublesKg = Number(doublesKg) || 0;
    if (doublesRatePerKg != null) entry.doublesRatePerKg = Number(doublesRatePerKg) || 0;
    else if (!entry.doublesRatePerKg) entry.doublesRatePerKg = defaults.doubleRate || 0;

    if (entry.goodSilkKg <= 0) {
      return res.status(400).json({ error: 'Enter good silk kg' });
    }

    await refreshBatchRates(batch);
    const rate = batch.effectiveRatePerKg;
    Object.assign(entry, calcUserRentalEntry(entry, rate), { completed: true });
    await batch.save();
    res.json(batchPayload(batch));
  } catch (e) {
    res.status(500).json({ error: e.message });
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
      const existing = await DriverSilkEntry.findOne({
        partyId: entry.partyId,
        vehicleId: vehicle._id,
        date: batch.assignedDate
      });
      const payload = {
        vehicleId: vehicle._id,
        partyId: entry.partyId,
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
