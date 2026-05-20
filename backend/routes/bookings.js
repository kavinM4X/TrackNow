const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Log = require('../models/Log');

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// GET /api/bookings/upcoming — next pending booking on or after today
router.get('/upcoming', protect, async (req, res) => {
  try {
    const today = todayISO();
    const booking = await Booking.findOne({
      userId: req.user._id,
      status: 'pending',
      date: { $gte: today }
    }).sort({ date: 1 });
    res.json(booking || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bookings/my (auth required, for logged-in user)
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(50);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings (auth required)
router.post('/', protect, async (req, res) => {
  try {
    const { date, location, quantityKg, notes } = req.body;
    const today = todayISO();

    if (!date || date < today) {
      return res.status(400).json({ error: 'Date must be today or in the future' });
    }
    if (!location || !LOCATIONS.includes(location)) {
      return res.status(400).json({ error: 'Please select a valid location' });
    }
    const qty = Number(quantityKg);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1 kg' });
    }

    const booking = await Booking.create({
      userId: req.user._id,
      userName: req.user.name,
      date,
      location,
      quantityKg: qty,
      notes: notes || ''
    });

    try {
      await Log.create({
        userId: req.user._id,
        userName: req.user.name,
        action: `Created booking for ${date}`,
        type: 'click',
        page: 'booking'
      });
    } catch (logErr) {
      console.warn('Log create failed:', logErr.message);
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('POST /bookings error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Could not save booking due to a database index conflict. Restart the API server and try again.'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/bookings/:id (auth required, for user's own booking)
router.put('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { date, location, quantityKg, notes, status } = req.body;
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { date, location, quantityKg, notes, status },
      { new: true, runValidators: true }
    );

    try {
      await Log.create({
        userId: req.user._id,
        userName: req.user.name,
        action: `Updated booking for ${date}`,
        type: 'click',
        page: 'booking'
      });
    } catch (logErr) {
      console.warn('Log create failed:', logErr.message);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
