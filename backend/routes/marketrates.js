const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const MarketRate = require('../models/MarketRate');
const Log = require('../models/Log');
const cache = require('../utils/cache');

// GET /api/market-rates/latest (auth required, all users)
router.get('/latest', protect, async (req, res) => {
  try {
    const cached = cache.get('market-rates:latest');
    if (cached) return res.json(cached);

    const rate = await MarketRate.findOne({}).sort({ date: -1 }).lean();
    cache.set('market-rates:latest', rate, 60_000);
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-rates (admin only) — history + latest in one response
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const cached = cache.get('market-rates:history');
    if (cached) return res.json(cached);

    const history = await MarketRate.find({}).sort({ date: -1 }).limit(30).lean();
    const result = { history, latest: history[0] || null };
    cache.set('market-rates:history', result, 60_000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-rates/for-date/:date (admin — batch entry auto-fill)
router.get('/for-date/:date', protect, adminOnly, async (req, res) => {
  try {
    const rate = await MarketRate.findOne({ date: req.params.date }).lean();
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-rates/:id (admin only)
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const rate = await MarketRate.findById(req.params.id).lean();
    if (!rate) return res.status(404).json({ error: 'Not found' });
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/market-rates (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      date,
      coimbatore,
      coimbatoreAvg,
      coimbatoreMin,
      mamballi,
      mamballiAvg,
      mamballiMin,
      ramnagar,
      ramnagarAvg,
      ramnagarMin,
      dharmapuri,
      dharmapuriAvg,
      dharmapuriMin
    } = req.body;
    const validMarkets = [
      { key: 'coimbatore', val: Number(coimbatore) },
      { key: 'mamballi', val: Number(mamballi) },
      { key: 'ramnagar', val: Number(ramnagar) },
      { key: 'dharmapuri', val: Number(dharmapuri) }
    ].filter(m => Number.isFinite(m.val) && m.val > 0);

    const sortedMarkets = [...validMarkets].sort((a, b) => b.val - a.val);
    const topRate = sortedMarkets.length > 0 ? sortedMarkets[0].val : null;
    const topMarket = sortedMarkets.length > 0 ? sortedMarkets[0].key : null;

    const avgInputs = [coimbatoreAvg, mamballiAvg, ramnagarAvg, dharmapuriAvg]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    const minAvg = avgInputs.length
      ? Math.round(avgInputs.reduce((a, b) => a + b, 0) / avgInputs.length)
      : (validMarkets.length ? Math.round(validMarkets.reduce((a, b) => a + b.val, 0) / validMarkets.length) : null);
    
    // Check for duplicate date
    const existing = await MarketRate.findOne({ date }).lean();
    if (existing) return res.status(409).json({ error: 'Rate already exists for this date', id: existing._id });
    
    const rate = await MarketRate.create({ 
      date,
      coimbatore: Number(coimbatore) || null,
      coimbatoreAvg: Number(coimbatoreAvg) || null,
      coimbatoreMin: Number(coimbatoreMin) || null,
      mamballi: Number(mamballi) || null,
      mamballiAvg: Number(mamballiAvg) || null,
      mamballiMin: Number(mamballiMin) || null,
      ramnagar: Number(ramnagar) || null,
      ramnagarAvg: Number(ramnagarAvg) || null,
      ramnagarMin: Number(ramnagarMin) || null,
      dharmapuri: Number(dharmapuri) || null,
      dharmapuriAvg: Number(dharmapuriAvg) || null,
      dharmapuriMin: Number(dharmapuriMin) || null,
      topRate, topMarket, minAvg, updatedBy: req.user.id 
    });

    cache.invalidatePrefix('market-rates');
    
    await Log.create({ 
      userId: req.user.id, userName: req.user.name, 
      action: `Updated market rate for ${date}`, type: 'admin', page: 'market-rates' 
    });
    
    res.status(201).json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/market-rates/:id (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const {
      date,
      coimbatore,
      coimbatoreAvg,
      coimbatoreMin,
      mamballi,
      mamballiAvg,
      mamballiMin,
      ramnagar,
      ramnagarAvg,
      ramnagarMin,
      dharmapuri,
      dharmapuriAvg,
      dharmapuriMin
    } = req.body;

    const validMarkets = [
      { key: 'coimbatore', val: Number(coimbatore) },
      { key: 'mamballi', val: Number(mamballi) },
      { key: 'ramnagar', val: Number(ramnagar) },
      { key: 'dharmapuri', val: Number(dharmapuri) }
    ].filter(m => Number.isFinite(m.val) && m.val > 0);

    const sortedMarkets = [...validMarkets].sort((a, b) => b.val - a.val);
    const topRate = sortedMarkets.length > 0 ? sortedMarkets[0].val : null;
    const topMarket = sortedMarkets.length > 0 ? sortedMarkets[0].key : null;

    const avgInputs = [coimbatoreAvg, mamballiAvg, ramnagarAvg, dharmapuriAvg]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    const minAvg = avgInputs.length
      ? Math.round(avgInputs.reduce((a, b) => a + b, 0) / avgInputs.length)
      : (validMarkets.length ? Math.round(validMarkets.reduce((a, b) => a + b.val, 0) / validMarkets.length) : null);
    
    const rate = await MarketRate.findByIdAndUpdate(
      req.params.id,
      {
        date,
        coimbatore: Number(coimbatore) || null,
        coimbatoreAvg: Number(coimbatoreAvg) || null,
        coimbatoreMin: Number(coimbatoreMin) || null,
        mamballi: Number(mamballi) || null,
        mamballiAvg: Number(mamballiAvg) || null,
        mamballiMin: Number(mamballiMin) || null,
        ramnagar: Number(ramnagar) || null,
        ramnagarAvg: Number(ramnagarAvg) || null,
        ramnagarMin: Number(ramnagarMin) || null,
        dharmapuri: Number(dharmapuri) || null,
        dharmapuriAvg: Number(dharmapuriAvg) || null,
        dharmapuriMin: Number(dharmapuriMin) || null,
        topRate, topMarket, minAvg, updatedBy: req.user.id
      },
      { new: true }
    );

    cache.invalidatePrefix('market-rates');
    
    await Log.create({ 
      userId: req.user.id, userName: req.user.name, 
      action: `Updated market rate for ${date}`, type: 'admin', page: 'market-rates' 
    });
    
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
