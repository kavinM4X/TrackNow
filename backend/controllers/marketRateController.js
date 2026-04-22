import MarketRate from '../models/MarketRate.js';

export const publishRate = async (req, res, next) => {
  try {
    const { location, date, topRate, avgRate, minRate } = req.body;

    const rate = await MarketRate.findOneAndUpdate(
      { location, date },
      { location, date, topRate, avgRate, minRate, createdBy: req.user._id },
      { new: true, upsert: true }
    );

    res.status(200).json(rate);
  } catch (error) {
    next(error);
  }
};

export const getLatestRates = async (req, res, next) => {
  try {
    const locations = ['Ramanagara', 'Mamballi', 'Dharmapuri', 'Coimbatore'];

    const ratePromises = locations.map(location =>
      MarketRate.findOne({ location }).sort({ date: -1 }).limit(1)
    );

    const results = await Promise.all(ratePromises);
    const rates = results.filter(rate => rate !== null);

    res.status(200).json(rates);
  } catch (error) {
    next(error);
  }
};

export const getRateHistory = async (req, res, next) => {
  try {
    const rates = await MarketRate.find().sort({ date: -1 }).limit(30);
    res.status(200).json(rates);
  } catch (error) {
    next(error);
  }
};
