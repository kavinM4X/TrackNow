const express = require('express');
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const DriverVehicle = require('../models/DriverVehicle');
const DriverParty = require('../models/DriverParty');
const DriverAdvance = require('../models/DriverAdvance');
const DriverExpense = require('../models/DriverExpense');
const DriverSilkEntry = require('../models/DriverSilkEntry');
const DriverRateConfig = require('../models/DriverRateConfig');
const { enrichVehicle, getVehicleTotals } = require('../utils/driverBalance');
const { getGlobalRates, getRatesForParty, calcSilkAmounts } = require('../utils/driverRates');

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

async function linkVehicleToDriver(vehicle, userId) {
  if (!vehicle.driverUserId) {
    vehicle.driverUserId = userId;
    await vehicle.save();
  }
  return vehicle;
}

async function listDriverVehicleDocs(userId, userName) {
  const linked = await DriverVehicle.find({ driverUserId: userId, status: 'active' });

  const driverNames = new Set();
  if (userName) driverNames.add(String(userName).trim().toLowerCase());
  linked.forEach((v) => {
    if (v.driverName) driverNames.add(String(v.driverName).trim().toLowerCase());
  });

  const or = [{ driverUserId: userId }];
  for (const name of driverNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    or.push({ driverName: new RegExp(`^${escaped}$`, 'i') });
  }

  const all = await DriverVehicle.find({ status: 'active', $or: or }).sort({ updatedAt: -1 });

  const seen = new Set();
  const merged = [];
  for (const v of all) {
    const id = String(v._id);
    if (seen.has(id)) continue;
    seen.add(id);
    await linkVehicleToDriver(v, userId);
    merged.push(v);
  }
  return merged;
}

async function listDriverVehicles(userId, userName) {
  const docs = await listDriverVehicleDocs(userId, userName);
  return Promise.all(docs.map(enrichVehicle));
}

async function resolveDriverVehicle(userId, vehicleId, userName) {
  const allowed = await listDriverVehicleDocs(userId, userName);
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
    const v = await DriverVehicle.create({
      vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
      driverName: driverName?.trim(),
      driverUserId: driverUserId || null,
      city,
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

adminRouter.post('/parties', protect, adminOnly, async (req, res) => {
  try {
    const party = await DriverParty.create(req.body);
    res.status(201).json(party);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put('/parties/:id', protect, adminOnly, async (req, res) => {
  try {
    const party = await DriverParty.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

driverRouter.get('/parties', protect, driverOnly, async (req, res) => {
  try {
    const parties = await DriverParty.find().sort({ name: 1 });
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
