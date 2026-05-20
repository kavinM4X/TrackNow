const TrackerConfig = require('../models/TrackerConfig');
const Booking = require('../models/Booking');
const Log = require('../models/Log');

// Get all tracker configs (admin only)
exports.getAllTrackers = async (req, res) => {
  try {
    const { page = 1, limit = 10, isEnabled, userId } = req.query;

    const query = {};
    if (isEnabled !== undefined) query.isEnabled = isEnabled === 'true';
    if (userId) query.user = userId;

    const trackers = await TrackerConfig.find(query)
      .populate('user', 'name email phone')
      .populate('booking', 'batchNumber status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TrackerConfig.countDocuments(query);

    res.status(200).json({
      success: true,
      count: trackers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      trackers
    });
  } catch (error) {
    console.error('Get all trackers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get tracker by ID
exports.getTrackerById = async (req, res) => {
  try {
    const tracker = await TrackerConfig.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('booking', 'batchNumber status pickupLocation deliveryLocation');

    if (!tracker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracker not found' 
      });
    }

    // Check if user owns the tracker or is admin
    if (req.user.role !== 'admin' && tracker.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.status(200).json({
      success: true,
      tracker
    });
  } catch (error) {
    console.error('Get tracker by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Create new tracker config (admin only)
exports.createTracker = async (req, res) => {
  try {
    const {
      user,
      booking,
      vehicleNumber,
      deviceId,
      deviceType,
      updateInterval,
      geofence
    } = req.body;

    const tracker = await TrackerConfig.create({
      user,
      booking,
      vehicleNumber,
      deviceId,
      deviceType,
      updateInterval,
      geofence
    });

    // If booking is provided, enable tracking on the booking
    if (booking) {
      await Booking.findByIdAndUpdate(booking, { trackingEnabled: true });
    }

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'create_tracker',
      entity: 'TrackerConfig',
      entityId: tracker._id,
      details: { vehicleNumber, deviceId },
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Tracker created successfully',
      tracker
    });
  } catch (error) {
    console.error('Create tracker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during tracker creation',
      error: error.message 
    });
  }
};

// Update tracker
exports.updateTracker = async (req, res) => {
  try {
    let tracker = await TrackerConfig.findById(req.params.id);

    if (!tracker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracker not found' 
      });
    }

    // Check if user owns the tracker or is admin
    if (req.user.role !== 'admin' && tracker.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const {
      isEnabled,
      updateInterval,
      batteryLevel,
      signalStrength,
      geofence,
      maintenanceStatus,
      notes
    } = req.body;

    if (isEnabled !== undefined) tracker.isEnabled = isEnabled;
    if (updateInterval) tracker.updateInterval = updateInterval;
    if (batteryLevel !== undefined) tracker.batteryLevel = batteryLevel;
    if (signalStrength) tracker.signalStrength = signalStrength;
    if (geofence) tracker.geofence = { ...tracker.geofence, ...geofence };
    if (maintenanceStatus) tracker.maintenanceStatus = maintenanceStatus;
    if (notes) tracker.notes = notes;

    tracker.updatedAt = Date.now();
    await tracker.save();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'update_tracker',
      entity: 'TrackerConfig',
      entityId: tracker._id,
      details: { updatedFields: Object.keys(req.body) },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Tracker updated successfully',
      tracker
    });
  } catch (error) {
    console.error('Update tracker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during tracker update',
      error: error.message 
    });
  }
};

// Delete tracker (admin only)
exports.deleteTracker = async (req, res) => {
  try {
    const tracker = await TrackerConfig.findById(req.params.id);

    if (!tracker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracker not found' 
      });
    }

    // If booking is associated, disable tracking on the booking
    if (tracker.booking) {
      await Booking.findByIdAndUpdate(tracker.booking, { trackingEnabled: false });
    }

    await tracker.deleteOne();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'delete_tracker',
      entity: 'TrackerConfig',
      entityId: tracker._id,
      details: { vehicleNumber: tracker.vehicleNumber },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Tracker deleted successfully'
    });
  } catch (error) {
    console.error('Delete tracker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during tracker deletion',
      error: error.message 
    });
  }
};

// Update tracker location
exports.updateTrackerLocation = async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    const tracker = await TrackerConfig.findById(req.params.id);

    if (!tracker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracker not found' 
      });
    }

    // Update last location
    tracker.lastLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
      speed,
      heading
    };

    // Add to route history
    tracker.route.push({
      latitude,
      longitude,
      timestamp: Date.now(),
      speed
    });

    // Keep only last 1000 route points
    if (tracker.route.length > 1000) {
      tracker.route = tracker.route.slice(-1000);
    }

    tracker.updatedAt = Date.now();
    await tracker.save();

    // If booking is associated, update booking location as well
    if (tracker.booking) {
      await Booking.findByIdAndUpdate(tracker.booking, {
        currentLocation: {
          latitude,
          longitude,
          timestamp: Date.now(),
          speed,
          heading
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      tracker
    });
  } catch (error) {
    console.error('Update tracker location error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during location update',
      error: error.message 
    });
  }
};

// Get tracker route history
exports.getTrackerRoute = async (req, res) => {
  try {
    const tracker = await TrackerConfig.findById(req.params.id);

    if (!tracker) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracker not found' 
      });
    }

    // Check if user owns the tracker or is admin
    if (req.user.role !== 'admin' && tracker.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.status(200).json({
      success: true,
      route: tracker.route,
      lastLocation: tracker.lastLocation
    });
  } catch (error) {
    console.error('Get tracker route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Enable/disable tracking for booking
exports.toggleTracking = async (req, res) => {
  try {
    const { bookingId, enabled } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check if user owns the booking or is admin
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    booking.trackingEnabled = enabled;
    await booking.save();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'toggle_tracking',
      entity: 'Booking',
      entityId: booking._id,
      details: { enabled },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: `Tracking ${enabled ? 'enabled' : 'disabled'} successfully`,
      booking
    });
  } catch (error) {
    console.error('Toggle tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during tracking toggle',
      error: error.message 
    });
  }
};
