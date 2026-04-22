import Log from '../models/Log.js';

export const getAllLogs = async (req, res, next) => {
  try {
    const { userId, type } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (type) filter.type = type;

    const logs = await Log.find(filter)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
