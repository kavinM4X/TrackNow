const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const TrackerConfig = require('../models/TrackerConfig');
const TrackerDay = require('../models/TrackerDay');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Log = require('../models/Log');
const {
  todayISO,
  activeUntilForBooking,
  isInActiveWindow,
  isExpired,
  normalizeTrackerDay,
  expireStaleTrackerDays,
  syncTrackerConfigForToday,
  userHasLiveTrackerToday
} = require('../utils/trackerExpiry');

router.use(async (req, res, next) => {
  try {
    await expireStaleTrackerDays();
  } catch (e) {
    console.warn('Tracker expiry check:', e.message);
  }
  next();
});

// GET /api/tracker/my — live on booking day through booking day + 1
router.get('/my', protect, async (req, res) => {
  try {
    const today = todayISO();
    const day = await TrackerDay.findOne({
      userId: req.user.id,
      isEnabled: true,
      date: { $lte: today },
      activeUntil: { $gte: today }
    });

    if (day && isInActiveWindow(day, today)) {
      const cfg = await TrackerConfig.findOne({ userId: req.user.id }).lean();
      return res.json({
        isEnabled: true,
        vehicleId: day.vehicleId,
        activatedAt: day.activatedAt,
        lastUpdated: day.lastUpdated,
        scheduledDate: day.date,
        activeUntil: day.activeUntil,
        latitude: cfg?.lastLatitude ?? null,
        longitude: cfg?.lastLongitude ?? null,
        lastLocationAt: cfg?.lastLocationAt ?? null
      });
    }

    const config = await TrackerConfig.findOne({ userId: req.user.id });
    if (!config?.isEnabled) {
      return res.json({ isEnabled: false });
    }
    return res.json({
      isEnabled: false,
      vehicleId: config.vehicleId,
      message: 'Tracking window ended (auto-off after booking day + 1)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tracker/position — farmer sends GPS while tracking is active
router.post('/position', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'Farmer app only' });
    }

    const today = todayISO();
    const day = await TrackerDay.findOne({
      userId: req.user.id,
      isEnabled: true,
      date: { $lte: today },
      activeUntil: { $gte: today }
    });

    if (!day || !isInActiveWindow(day, today)) {
      return res.status(403).json({ error: 'Tracking is not active for your account' });
    }

    let lat = Number(req.body.lat);
    let lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng required' });
    }
    lat = Math.max(-90, Math.min(90, lat));
    lng = Math.max(-180, Math.min(180, lng));

    await TrackerConfig.findOneAndUpdate(
      { userId: req.user.id },
      {
        lastLatitude: lat,
        lastLongitude: lng,
        lastLocationAt: new Date(),
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/tracker/live-map — all vehicles live today (admin)
router.get('/live-map', protect, adminOnly, async (req, res) => {
  try {
    const today = todayISO();
    const { hubForLocation } = require('../utils/marketCoords');

    const activeDays = await TrackerDay.find({
      isEnabled: true,
      date: { $lte: today },
      activeUntil: { $gte: today }
    }).lean();

    const markers = [];

    for (const td of activeDays) {
      const cfg = await TrackerConfig.findOne({ userId: td.userId }).lean();
      let lat = cfg?.lastLatitude;
      let lng = cfg?.lastLongitude;

      if (lat == null || lng == null) {
        const bid = td.bookingIds?.[0];
        let loc = 'Coimbatore';
        if (bid) {
          const b = await Booking.findById(bid).select('location').lean();
          if (b?.location) loc = b.location;
        }
        const hub = hubForLocation(loc);
        lat = hub.lat;
        lng = hub.lng;
      }

      const user = await User.findById(td.userId).select('name').lean();

      markers.push({
        userId: td.userId,
        userName: td.userName || user?.name || 'Farmer',
        vehicleId: td.vehicleId || cfg?.vehicleId || '—',
        lat,
        lng,
        lastLocationAt: cfg?.lastLocationAt || null,
        bookingDate: td.date,
        activeUntil: td.activeUntil || activeUntilForBooking(td.date),
        approximate: cfg?.lastLatitude == null
      });
    }

    res.json({ markers, updatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/booking-dates', protect, adminOnly, async (req, res) => {
  try {
    const dates = await Booking.distinct('date', {
      status: { $nin: ['cancelled'] }
    });
    dates.sort((a, b) => b.localeCompare(a));
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-date', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query required (YYYY-MM-DD)' });
    }

    const bookings = await Booking.find({
      date,
      status: { $nin: ['cancelled'] }
    })
      .sort({ createdAt: -1 })
      .lean();

    const byUser = new Map();
    for (const b of bookings) {
      const uid = String(b.userId);
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(b);
    }

    const userIds = [...byUser.keys()];
    if (userIds.length === 0) {
      return res.json({ date, count: 0, rows: [] });
    }

    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const trackerDays = await TrackerDay.find({ date, userId: { $in: userIds } }).lean();
    const tdMap = Object.fromEntries(
      trackerDays.map((t) => [String(t.userId), normalizeTrackerDay(t)])
    );

    const rows = userIds
      .map((uid) => ({
        user: userMap[uid],
        bookings: byUser.get(uid),
        trackerDay: tdMap[uid] || null
      }))
      .filter((r) => r.user)
      .sort((a, b) => (a.user.name || '').localeCompare(b.user.name || ''));

    res.json({ date, count: rows.length, rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' });
    const result = [];
    for (const user of users) {
      const trackerConfig = await TrackerConfig.findOne({ userId: user._id });
      result.push({ user, trackerConfig });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    const q = { isEnabled: true };
    if (date) q.date = date;

    const history = await TrackerDay.find(q)
      .sort({ date: -1, activatedAt: -1 })
      .limit(30)
      .populate('userId', 'name');

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { isEnabled, vehicleId, date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Booking date is required (YYYY-MM-DD)' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (isEnabled && !vehicleId) {
      return res.status(400).json({ error: 'Vehicle ID required when enabling tracker' });
    }

    const dayBookings = await Booking.find({
      userId: req.params.userId,
      date,
      status: { $nin: ['cancelled'] }
    });

    if (dayBookings.length === 0) {
      return res.status(400).json({
        error: 'No active booking on this date for this user'
      });
    }

    const until = activeUntilForBooking(date);
    const update = {
      userName: user.name,
      isEnabled,
      vehicleId: vehicleId || null,
      bookingIds: dayBookings.map((b) => b._id),
      activeUntil: until,
      lastUpdated: new Date(),
      autoDisabledAt: null
    };

    if (isEnabled) {
      update.activatedAt = new Date();
      update.activatedBy = req.user.id;
    } else {
      update.autoDisabledAt = new Date();
    }

    const trackerDay = await TrackerDay.findOneAndUpdate(
      { userId: req.params.userId, date },
      update,
      { upsert: true, new: true }
    );

    const today = todayISO();
    const liveToday = await userHasLiveTrackerToday(req.params.userId, today);
    await syncTrackerConfigForToday(req.params.userId, user.name, liveToday, liveToday ? vehicleId : null);

    if (liveToday && vehicleId && isEnabled) {
      const cfg = await TrackerConfig.findOne({ userId: req.params.userId }).lean();
      if (cfg?.lastLatitude == null || cfg?.lastLongitude == null) {
        const { hubForLocation } = require('../utils/marketCoords');
        const hubLoc = dayBookings[0]?.location || 'Coimbatore';
        const hub = hubForLocation(hubLoc);
        await TrackerConfig.findOneAndUpdate(
          { userId: req.params.userId },
          {
            lastLatitude: hub.lat,
            lastLongitude: hub.lng,
            lastLocationAt: new Date()
          },
          { upsert: true }
        );
      }
    }

    await Log.create({
      userId: req.user.id,
      userName: req.user.name,
      action: isEnabled
        ? `Enabled tracker for ${user.name} on ${date} (auto-off after ${until})`
        : `Disabled tracker for ${user.name} on ${date}`,
      type: 'admin',
      page: 'tracker-control'
    });

    res.json(trackerDay);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
