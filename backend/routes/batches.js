const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Batch = require('../models/Batch');
const MarketRate = require('../models/MarketRate');
const { enrichBatch, clientVisibleBatchQuery, isBatchVisibleToClient } = require('../utils/batchCalc');

// GET /api/batches/my — { batches, totalKg } (only admin-priced entries)
router.get('/my', protect, async (req, res) => {
  try {
    const visibleQuery = clientVisibleBatchQuery(req.user.id);
    const batches = await Batch.find(visibleQuery).sort({ date: -1 });
    const agg = await Batch.aggregate([
      { $match: { ...visibleQuery, userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalKg: {
            $sum: { $ifNull: ['$goodSilkKg', '$quantityKg'] }
          }
        }
      }
    ]);
    const totalKg = Math.round((agg[0]?.totalKg || 0) * 10) / 10;
    const enriched = batches.map((b) => enrichBatch(b, null));
    res.json({ batches: enriched, totalKg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/batches/recent
router.get('/recent', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'User clients only' });
    }
    const batches = await Batch.find(clientVisibleBatchQuery(req.user.id))
      .sort({ date: -1 })
      .limit(2);
    res.json(batches.map((b) => enrichBatch(b, null)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/batches/stats
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'User clients only' });
    }
    const visibleQuery = clientVisibleBatchQuery(req.user.id);
    const totalBatches = await Batch.countDocuments(visibleQuery);
    const agg = await Batch.aggregate([
      { $match: { ...visibleQuery, userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalKg: { $sum: { $ifNull: ['$goodSilkKg', '$quantityKg'] } }
        }
      }
    ]);
    res.json({
      totalBatches,
      totalKg: Math.round((agg[0]?.totalKg || 0) * 10) / 10
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/batches/:id — batch detail with market rate
router.get('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid batch ID' });
    }
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    if (req.user.role === 'user' && String(batch.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    if (req.user.role === 'user' && !isBatchVisibleToClient(batch)) {
      return res.status(404).json({ error: 'Batch not available yet. Admin will add pricing soon.' });
    }

    const marketRate = await MarketRate.findOne({ date: batch.date });
    res.json({
      batch: enrichBatch(batch, marketRate),
      marketRate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
