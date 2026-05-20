const Log = require('../models/Log');

// Get all logs (admin only)
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, userId, status, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (userId) query.user = userId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await Log.find(query)
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Log.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (error) {
    console.error('Get all logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get log by ID (admin only)
exports.getLogById = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id).populate('user', 'name email');

    if (!log) {
      return res.status(404).json({ 
        success: false, 
        message: 'Log not found' 
      });
    }

    res.status(200).json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Get log by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get log statistics (admin only)
exports.getLogStats = async (req, res) => {
  try {
    const totalLogs = await Log.countDocuments();
    const successLogs = await Log.countDocuments({ status: 'success' });
    const failureLogs = await Log.countDocuments({ status: 'failure' });
    const warningLogs = await Log.countDocuments({ status: 'warning' });

    // Get recent activity
    const recentLogs = await Log.find()
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .limit(10);

    // Get action distribution
    const actionDistribution = await Log.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalLogs,
        success: successLogs,
        failure: failureLogs,
        warning: warningLogs
      },
      recentLogs,
      actionDistribution
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Clear old logs (admin only)
exports.clearOldLogs = async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'clear_old_logs',
      entity: 'Log',
      details: { days, deletedCount: result.deletedCount },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} logs older than ${days} days`
    });
  } catch (error) {
    console.error('Clear old logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during log cleanup',
      error: error.message 
    });
  }
};
