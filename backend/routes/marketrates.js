const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const MarketRate = require('../models/MarketRate');
const Log = require('../models/Log');

// GET /api/market-rates/latest (auth required, all users)
router.get('/latest', protect, async (req, res) => {
  try {
    const rate = await MarketRate.findOne({}).sort({ date: -1 });
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-rates (admin only) — history + latest in one response
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const history = await MarketRate.find({}).sort({ date: -1 }).limit(30);
    res.json({ history, latest: history[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-rates/for-date/:date (admin — batch entry auto-fill)
router.get('/for-date/:date', protect, adminOnly, async (req, res) => {
  try {
    const rate = await MarketRate.findOne({ date: req.params.date });
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
    const rate = await MarketRate.findById(req.params.id);
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
    const rates = [coimbatore, mamballi, ramnagar, dharmapuri];
    const topRate = Math.max(...rates);
    const markets = ['coimbatore','mamballi','ramnagar','dharmapuri'];
    const topMarket = markets[rates.indexOf(topRate)];
    const avgInputs = [coimbatoreAvg, mamballiAvg, ramnagarAvg, dharmapuriAvg]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);
    const minAvg = avgInputs.length
      ? Math.round(avgInputs.reduce((a, b) => a + b, 0) / avgInputs.length)
      : Math.round(rates.reduce((a,b)=>a+b,0)/4);
    
    // Check for duplicate date
    const existing = await MarketRate.findOne({ date });
    if (existing) return res.status(409).json({ error: 'Rate already exists for this date', id: existing._id });
    
    const rate = await MarketRate.create({ 
      date,
      coimbatore,
      coimbatoreAvg,
      coimbatoreMin: coimbatoreMin ?? null,
      mamballi,
      mamballiAvg,
      mamballiMin: mamballiMin ?? null,
      ramnagar,
      ramnagarAvg,
      ramnagarMin: ramnagarMin ?? null,
      dharmapuri,
      dharmapuriAvg,
      dharmapuriMin: dharmapuriMin ?? null,
      topRate, topMarket, minAvg, updatedBy: req.user.id 
    });
    
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
    const rates = [coimbatore, mamballi, ramnagar, dharmapuri];
    const topRate = Math.max(...rates);
    const markets = ['coimbatore','mamballi','ramnagar','dharmapuri'];
    const topMarket = markets[rates.indexOf(topRate)];
    const avgInputs = [coimbatoreAvg, mamballiAvg, ramnagarAvg, dharmapuriAvg]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);
    const minAvg = avgInputs.length
      ? Math.round(avgInputs.reduce((a, b) => a + b, 0) / avgInputs.length)
      : Math.round(rates.reduce((a,b)=>a+b,0)/4);
    
    const rate = await MarketRate.findByIdAndUpdate(
      req.params.id,
      {
        date,
        coimbatore,
        coimbatoreAvg,
        coimbatoreMin: coimbatoreMin ?? null,
        mamballi,
        mamballiAvg,
        mamballiMin: mamballiMin ?? null,
        ramnagar,
        ramnagarAvg,
        ramnagarMin: ramnagarMin ?? null,
        dharmapuri,
        dharmapuriAvg,
        dharmapuriMin: dharmapuriMin ?? null,
        topRate, topMarket, minAvg, updatedBy: req.user.id
      },
      { new: true }
    );
    
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
