import Log from '../models/Log.js';

const writeLog = async (userId, action, type = 'action') => {
  try {
    const log = new Log({
      userId,
      action,
      type
    });
    await log.save();
  } catch (error) {
    // Silently fail - logs should never crash the main flow
    console.error('Failed to write log:', error.message);
  }
};

export default writeLog;
