const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Log = require('../models/Log');

// POST /api/logs (any authenticated user)
router.post('/', protect, (req, res) => {
  try {
    const { action, type, page } = req.body;

    // Async background save - do not block client response
    Log.create({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action,
      type,
      page
    }).catch((err) => console.error('Log write error:', err.message));

    res.status(201).json({ message: 'Log created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
