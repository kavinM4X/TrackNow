const MarketRate = require('../models/MarketRate');
const Log = require('../models/Log');

// Get all market rates
exports.getAllMarketRates = async (req, res) => {
  try {
    const { page = 1, limit = 10, silkType, market, location, isActive } = req.query;

    const query = {};
    if (silkType) query.silkType = silkType;
    if (market) query.market = market;
    if (location) query.location = location;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const marketRates = await MarketRate.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MarketRate.countDocuments(query);

    res.status(200).json({
      success: true,
      count: marketRates.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      marketRates
    });
  } catch (error) {
    console.error('Get all market rates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get market rate by ID
exports.getMarketRateById = async (req, res) => {
  try {
    const marketRate = await MarketRate.findById(req.params.id).populate('createdBy', 'name email');

    if (!marketRate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Market rate not found' 
      });
    }

    res.status(200).json({
      success: true,
      marketRate
    });
  } catch (error) {
    console.error('Get market rate by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Create new market rate (admin only)
exports.createMarketRate = async (req, res) => {
  try {
    const {
      silkType,
      variety,
      rate,
      unit,
      market,
      location,
      trend,
      changePercentage,
      qualityGrade,
      source
    } = req.body;

    const marketRate = await MarketRate.create({
      silkType,
      variety,
      rate,
      unit,
      market,
      location,
      trend,
      changePercentage,
      qualityGrade,
      source,
      createdBy: req.user._id
    });

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'create_market_rate',
      entity: 'MarketRate',
      entityId: marketRate._id,
      details: { silkType, rate, market },
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Market rate created successfully',
      marketRate
    });
  } catch (error) {
    console.error('Create market rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during market rate creation',
      error: error.message 
    });
  }
};

// Update market rate (admin only)
exports.updateMarketRate = async (req, res) => {
  try {
    let marketRate = await MarketRate.findById(req.params.id);

    if (!marketRate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Market rate not found' 
      });
    }

    const {
      rate,
      trend,
      changePercentage,
      qualityGrade,
      source,
      isActive
    } = req.body;

    if (rate) marketRate.rate = rate;
    if (trend) marketRate.trend = trend;
    if (changePercentage !== undefined) marketRate.changePercentage = changePercentage;
    if (qualityGrade) marketRate.qualityGrade = qualityGrade;
    if (source) marketRate.source = source;
    if (isActive !== undefined) marketRate.isActive = isActive;

    marketRate.updatedAt = Date.now();
    await marketRate.save();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'update_market_rate',
      entity: 'MarketRate',
      entityId: marketRate._id,
      details: { updatedFields: Object.keys(req.body) },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Market rate updated successfully',
      marketRate
    });
  } catch (error) {
    console.error('Update market rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during market rate update',
      error: error.message 
    });
  }
};

// Delete market rate (admin only)
exports.deleteMarketRate = async (req, res) => {
  try {
    const marketRate = await MarketRate.findById(req.params.id);

    if (!marketRate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Market rate not found' 
      });
    }

    await marketRate.deleteOne();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'delete_market_rate',
      entity: 'MarketRate',
      entityId: marketRate._id,
      details: { silkType: marketRate.silkType, rate: marketRate.rate },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Market rate deleted successfully'
    });
  } catch (error) {
    console.error('Delete market rate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during market rate deletion',
      error: error.message 
    });
  }
};

// Get latest market rates by silk type
exports.getLatestRates = async (req, res) => {
  try {
    const { silkType } = req.query;

    const query = { isActive: true };
    if (silkType) query.silkType = silkType;

    const marketRates = await MarketRate.find(query)
      .sort({ date: -1 })
      .limit(20);

    // Group by silk type and get latest rate for each
    const latestRates = {};
    marketRates.forEach(rate => {
      if (!latestRates[rate.silkType]) {
        latestRates[rate.silkType] = rate;
      }
    });

    res.status(200).json({
      success: true,
      latestRates: Object.values(latestRates)
    });
  } catch (error) {
    console.error('Get latest rates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get market rate trends
exports.getMarketTrends = async (req, res) => {
  try {
    const { silkType, days = 30 } = req.query;

    const query = { isActive: true };
    if (silkType) query.silkType = silkType;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const marketRates = await MarketRate.find({
      ...query,
      date: { $gte: startDate }
    })
    .sort({ date: 1 });

    res.status(200).json({
      success: true,
      trends: marketRates
    });
  } catch (error) {
    console.error('Get market trends error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
