import TrackerConfig from '../models/TrackerConfig.js';

export const getMyTracker = async (req, res, next) => {
  try {
    const tracker = await TrackerConfig.findOne({ userId: req.user._id });

    if (!tracker) {
      return res.status(200).json({ isEnabled: false });
    }

    res.status(200).json(tracker);
  } catch (error) {
    next(error);
  }
};

export const updateTracker = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = { ...req.body, lastUpdated: Date.now() };

    const tracker = await TrackerConfig.findOneAndUpdate(
      { userId },
      updateData,
      { upsert: true, new: true }
    );

    res.status(200).json(tracker);
  } catch (error) {
    next(error);
  }
};
