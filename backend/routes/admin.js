const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Booking = require('../models/Booking');
const MarketRate = require('../models/MarketRate');
const Batch = require('../models/Batch');
const TrackerConfig = require('../models/TrackerConfig');
const Log = require('../models/Log');
const { normalizePhone } = require('../utils/phone');

function normalizeYmd(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function enrichHistoryBatch(batch) {
  const goodSilkKg = Number(batch.goodSilkKg ?? batch.quantityKg ?? 0);
  const wasteKg = Number(batch.wasteKg ?? 0);
  const doublesKg = Number(batch.doubles ?? 0);
  const estimatedValue = Number(batch.estimatedValue ?? 0);
  return {
    ...batch,
    date: normalizeYmd(batch.date),
    goodSilkKg,
    wasteKg,
    doublesKg,
    estimatedValue
  };
}

function sumHistory(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.totalBatches += 1;
      acc.totalGoodSilkKg += Number(r.goodSilkKg || 0);
      acc.totalWasteKg += Number(r.wasteKg || 0);
      acc.totalEstimatedValue += Number(r.estimatedValue || 0);
      return acc;
    },
    { totalBatches: 0, totalGoodSilkKg: 0, totalWasteKg: 0, totalEstimatedValue: 0 }
  );
}

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Date', 'User', 'Location', 'GoodSilkKg', 'WasteKg', 'DoublesKg', 'EstimatedValue'];
  const lines = rows.map((r) =>
    [
      r.date || '',
      r.userName || '',
      r.location || '',
      r.goodSilkKg || 0,
      r.wasteKg || 0,
      r.doublesKg || 0,
      r.estimatedValue || 0
    ]
      .map(esc)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

const { listBackups, backupRoot, runMonthlyBackup } = require('../utils/monthlyBackup');

// GET /api/admin/backups (admin only)
router.get('/backups', protect, adminOnly, async (req, res) => {
  try {
    res.json({ backups: listBackups(), backupDir: backupRoot() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/backups/run (admin only) — manual monthly backup
router.post('/backups/run', protect, adminOnly, async (req, res) => {
  try {
    const result = await runMonthlyBackup({ reason: 'admin-manual' });
    res.json({ message: 'Backup completed', result, backups: listBackups() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/stats (admin only)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    
    res.json({ totalUsers, pendingBookings, activeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/batch-chart (admin only)
router.get('/batch-chart', protect, adminOnly, async (req, res) => {
  try {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, // YYYY-MM
        label: monthNames[d.getMonth()],
        doneDays: 0
      });
    }

    const firstMonthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const firstMonthKey = `${firstMonthStart.getFullYear()}-${String(firstMonthStart.getMonth() + 1).padStart(2, '0')}`;

    // Pull lightweight rows and normalize in JS to avoid date-type mismatch issues.
    const [batches, completedBookings] = await Promise.all([
      Batch.find({}).select('date').lean(),
      Booking.find({ status: 'completed' }).select('date').lean()
    ]);

    const monthDates = new Map(months.map((m) => [m.key, new Set()]));

    for (const b of batches) {
      let monthKey = null;
      if (typeof b.date === 'string') {
        monthKey = b.date.slice(0, 7);
      } else if (b.date instanceof Date) {
        monthKey = `${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!monthKey || monthKey.length !== 7 || monthKey < firstMonthKey) continue;
      if (!monthDates.has(monthKey)) continue;
      const dayKey = typeof b.date === 'string'
        ? b.date
        : `${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, '0')}-${String(b.date.getDate()).padStart(2, '0')}`;
      if (dayKey.length !== 10) continue;
      monthDates.get(monthKey).add(dayKey);
    }
    for (const bk of completedBookings) {
      if (typeof bk.date !== 'string' || bk.date.length < 10) continue;
      const monthKey = bk.date.slice(0, 7);
      if (monthKey < firstMonthKey || !monthDates.has(monthKey)) continue;
      monthDates.get(monthKey).add(bk.date);
    }

    res.json(months.map((m) => ({ month: m.label, doneDays: monthDates.get(m.key)?.size || 0 })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/recent-bookings (admin only)
router.get('/recent-bookings', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    res.set('Cache-Control', 'no-store');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public registration link (no expiry) — also mounted in app.js
const { adminRouter: userInviteAdmin } = require('./publicUserInvite');
router.use('/user-invite', userInviteAdmin);

// GET /api/admin/users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/users/:id/toggle-status (admin only)
router.patch('/users/:id/toggle-status', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const newStatus = !user.isActive;
    user.isActive = newStatus;
    
    if (!newStatus) {
      user.trackerEnabled = false;
      await TrackerConfig.findOneAndUpdate(
        { userId: req.params.id },
        { isEnabled: false }
      );
    }
    
    await user.save();
    
    await Log.create({ 
      userId: req.user.id, userName: req.user.name, 
      action: `${newStatus ? 'Enabled' : 'Disabled'} user ${user.name}`, type: 'admin', page: 'users' 
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/users (admin only)
router.post('/users', protect, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, role, password, trackerEnabled, vehicleId } = req.body;
    const { createAppUser } = require('../utils/createAppUser');

    const result = await createAppUser({
      name,
      phone,
      email,
      password,
      role: role || 'user',
      trackerEnabled,
      vehicleId,
      activatedBy: req.user._id
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    await Log.create({
      userId: req.user._id,
      userName: req.user.name,
      action: `Created user ${result.user.name}`,
      type: 'admin',
      page: 'create-user'
    });

    res.status(201).json({ message: 'User created', userId: result.user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id (admin only)
router.get('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    const trackerConfig = await TrackerConfig.findOne({ userId: req.params.id });
    res.json({ user, trackerConfig });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id (admin only)
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, phone, isActive, trackerEnabled, vehicleId } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, isActive, trackerEnabled, vehicleId },
      { new: true }
    ).select('-password');
    
    if (trackerEnabled) {
      await TrackerConfig.findOneAndUpdate(
        { userId: req.params.id },
        { isEnabled: true, vehicleId, lastUpdated: new Date() },
        { upsert: true }
      );
    } else {
      await TrackerConfig.findOneAndUpdate(
        { userId: req.params.id },
        { isEnabled: false, lastUpdated: new Date() }
      );
    }
    
    await Log.create({ 
      userId: req.user.id, userName: req.user.name, 
      action: `Updated user ${name}`, type: 'admin', page: 'edit-user' 
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/users/:id/reset-password (admin only)
router.post('/users/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = newPassword;
    await user.save();
    
    await Log.create({ 
      userId: req.user.id, userName: req.user.name, 
      action: `Reset password for user ${req.params.id}`, type: 'admin', page: 'edit-user' 
    });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/logs/filter-options — users & screens for filter dropdowns
router.get('/logs/filter-options', protect, adminOnly, async (req, res) => {
  try {
    const [screens, users] = await Promise.all([
      Log.distinct('page', { page: { $nin: [null, ''] } }),
      Log.aggregate([
        { $match: { userId: { $exists: true, $ne: null } } },
        { $group: { _id: '$userId', userName: { $first: '$userName' } } },
        { $sort: { userName: 1 } },
        { $limit: 300 }
      ])
    ]);

    res.json({
      screens: screens.filter(Boolean).sort(),
      users: users.map((u) => ({
        userId: String(u._id),
        userName: u.userName || 'Unknown'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function buildLogsQuery({ type, fromDate, toDate, userId, screen, search }) {
  const query = {};

  if (type && type !== 'all') query.type = type;
  if (userId && userId !== 'all') query.userId = userId;
  if (screen && screen !== 'all') query.page = screen;

  if (search && search.trim()) {
    const re = { $regex: search.trim(), $options: 'i' };
    query.$or = [{ action: re }, { userName: re }, { page: re }];
  }

  if (fromDate || toDate) {
    query.timestamp = {};
    if (fromDate) query.timestamp.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.timestamp.$lte = to;
    }
  }

  return query;
}

// GET /api/admin/logs (admin only)
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const { type, fromDate, toDate, page = 1, limit = 50, userId, screen, search } = req.query;
    const query = buildLogsQuery({ type, fromDate, toDate, userId, screen, search });

    const lim = Number(limit) || 50;
    const pg = Number(page) || 1;
    const total = await Log.countDocuments(query);
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip((pg - 1) * lim)
      .limit(lim);

    res.json({
      logs,
      total,
      page: pg,
      totalPages: Math.max(1, Math.ceil(total / lim))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/active-users-count (admin only)
router.get('/active-users-count', protect, adminOnly, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ids = await Log.distinct('userId', {
      type: 'login',
      timestamp: { $gte: twentyFourHoursAgo },
      userId: { $exists: true, $ne: null }
    });
    res.json({ count: ids.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/batches/recent (admin only)
router.get('/batches/recent', protect, adminOnly, async (req, res) => {
  try {
    const batches = await Batch.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name');
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/batches/history (admin only)
router.get('/batches/history', protect, adminOnly, async (req, res) => {
  try {
    const { userId, location, fromDate, toDate, search, export: exportType } = req.query;
    const q = {};
    if (userId) q.userId = userId;
    if (location && location !== 'all') q.location = location;

    let rows = await Batch.find(q).sort({ date: -1, createdAt: -1 }).lean();
    rows = rows.map(enrichHistoryBatch).filter((r) => r.date);

    if (fromDate) rows = rows.filter((r) => r.date >= fromDate);
    if (toDate) rows = rows.filter((r) => r.date <= toDate);
    if (search && String(search).trim()) {
      const s = String(search).trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.userName || '').toLowerCase().includes(s) ||
          (r.location || '').toLowerCase().includes(s) ||
          (r.date || '').includes(s)
      );
    }

    const summary = sumHistory(rows);
    const users = await User.find({ role: 'user' }).select('name').sort({ name: 1 }).lean();

    if (exportType === 'csv') {
      const csv = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="batch-history.csv"');
      return res.send(csv);
    }

    res.json({
      rows,
      summary,
      users: users.map((u) => ({ _id: String(u._id), name: u.name }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/batches (admin only)
router.post('/batches', protect, adminOnly, async (req, res) => {
  try {
    const {
      userId,
      date,
      location,
      goodSilkKg,
      wasteKg,
      doubles,
      goodSilkRatePerKg,
      wasteRatePerKg,
      doublesRatePerKg,
      linkedBookingId,
      notes
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!location) {
      return res.status(400).json({ error: 'Market / location is required' });
    }

    const good = Number(goodSilkKg) || 0;
    const waste = Number(wasteKg) || 0;
    const doublesKg = Number(doubles) || 0;
    const totalKg = Math.round((good + waste + doublesKg) * 10) / 10;

    if (totalKg <= 0) {
      return res.status(400).json({
        error: 'Enter at least one positive weight (good silk, waste, or doubles)'
      });
    }

    const rateDoc = await MarketRate.findOne({ date });
    const { marketRateForLocation, roundMoney, validateAdminBatchRates } = require('../utils/batchCalc');

    const rateError = validateAdminBatchRates(req.body);
    if (rateError) {
      return res.status(400).json({ error: rateError });
    }

    const gRate = Number(goodSilkRatePerKg);
    const wRate = Number(wasteRatePerKg);
    const dRate = Number(doublesRatePerKg);
    if (![gRate, wRate, dRate].every((n) => Number.isFinite(n) && n >= 0)) {
      return res.status(400).json({ error: 'All rates must be valid numbers (0 or more)' });
    }

    const goodSilkAmount = roundMoney(good * gRate);
    const wasteAmount = roundMoney(waste * wRate);
    const doublesAmount = roundMoney(doublesKg * dRate);
    const estimatedValue = goodSilkAmount + wasteAmount + doublesAmount;

    const batch = await Batch.create({
      userId,
      userName: user.name,
      date,
      location,
      totalWeightKg: totalKg,
      goodSilkKg: good,
      quantityKg: good,
      wasteKg: waste,
      doubles: doublesKg,
      goodSilkRatePerKg: gRate,
      wasteRatePerKg: wRate,
      doublesRatePerKg: dRate,
      goodSilkAmount,
      wasteAmount,
      doublesAmount,
      ratePerKg: gRate,
      estimatedValue,
      linkedBookingId: linkedBookingId || null,
      notes,
      updatedBy: req.user.id,
      visibleToClient: true
    });

    if (linkedBookingId) {
      await Booking.findByIdAndUpdate(linkedBookingId, { status: 'completed' });
    }

    await Log.create({
      userId: req.user.id,
      userName: req.user.name,
      action: `Added batch for ${user.name}: ${totalKg}kg total, est. ₹${estimatedValue}`,
      type: 'admin',
      page: 'batch-entry'
    });

    const { enrichBatch } = require('../utils/batchCalc');
    res.status(201).json(enrichBatch(batch, rateDoc));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/bookings (admin only)
router.get('/bookings', protect, adminOnly, async (req, res) => {
  try {
    const { userId, status, search } = req.query;
    const q = {};
    if (userId) q.userId = userId;
    if (status && status !== 'all') q.status = status;

    let bookings = await Booking.find(q)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (search) {
      const term = String(search).toLowerCase();
      bookings = bookings.filter(
        (b) =>
          (b.userName && b.userName.toLowerCase().includes(term)) ||
          (b.date && b.date.includes(term)) ||
          (b.location && b.location.toLowerCase().includes(term))
      );
    }

    const [all, pending, confirmed, completed, cancelled] = await Promise.all([
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      bookings,
      counts: { all, pending, confirmed, completed, cancelled }
    });
  } catch (error) {
    console.error('GET /admin/bookings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status / admin note (shared handler)
async function updateBooking(req, res) {
  try {
    const id = req.params.id || req.body.bookingId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const { status, adminNote } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (status !== undefined) {
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      booking.status = status;
    }
    if (adminNote !== undefined) booking.adminNote = adminNote;

    await booking.save();

    const actionMap = {
      confirmed: `Confirmed booking for ${booking.userName}`,
      completed: `Marked booking done for ${booking.userName}`,
      cancelled: `Cancelled booking for ${booking.userName}`,
      pending: `Reopened booking for ${booking.userName}`
    };
    if (status && actionMap[status]) {
      try {
        await Log.create({
          userId: req.user._id,
          userName: req.user.name,
          action: actionMap[status],
          type: 'admin',
          page: 'bookings'
        });
      } catch (logErr) {
        console.warn('Log create failed:', logErr.message);
      }
    }

    res.json(booking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/admin/bookings/update-status — body: { bookingId, status, adminNote? }
router.post('/bookings/update-status', protect, adminOnly, updateBooking);

// Legacy paths (still supported)
router.post('/bookings/:id/status', protect, adminOnly, updateBooking);
router.put('/bookings/:id', protect, adminOnly, updateBooking);
router.patch('/bookings/:id', protect, adminOnly, updateBooking);

// GET /api/admin/bookings/:id (admin only)
router.get('/bookings/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id).populate('userId', 'name phone email');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const marketRate = await MarketRate.findOne({ date: booking.date });

    res.json({ booking, user: booking.userId, marketRate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
