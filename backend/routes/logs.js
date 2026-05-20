const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Log = require('../models/Log');

// POST /api/logs (any authenticated user)
router.post('/', protect, async (req, res) => {
  try {
    const { action, type, page } = req.body;

    await Log.create({
      userId: req.user.id,
      userName: req.user.name,
      action,
      type,
      page
    });

    res.status(201).json({ message: 'Log created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
