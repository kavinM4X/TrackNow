const Booking = require('../models/Booking');
const Log = require('../models/Log');

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, bookingType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.user = userId;
    if (bookingType) query.bookingType = bookingType;

    // If not admin, only show user's own bookings
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      bookings
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    // Check if user owns the booking or is admin
    if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Create new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      batchNumber,
      bookingType,
      silkType,
      quantity,
      pickupLocation,
      deliveryLocation,
      scheduledDate,
      scheduledTime,
      notes,
      priority
    } = req.body;

    const booking = await Booking.create({
      user: req.user._id,
      batchNumber,
      bookingType,
      silkType,
      quantity,
      pickupLocation,
      deliveryLocation,
      scheduledDate,
      scheduledTime,
      notes,
      priority
    });

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'create_booking',
      entity: 'Booking',
      entityId: booking._id,
      details: { batchNumber, bookingType },
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during booking creation',
      error: error.message 
    });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);

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

    const {
      status,
      vehicleNumber,
      driverName,
      driverPhone,
      trackingEnabled,
      estimatedArrival,
      actualArrival,
      notes,
      priority
    } = req.body;

    if (status) booking.status = status;
    if (vehicleNumber) booking.vehicleNumber = vehicleNumber;
    if (driverName) booking.driverName = driverName;
    if (driverPhone) booking.driverPhone = driverPhone;
    if (trackingEnabled !== undefined) booking.trackingEnabled = trackingEnabled;
    if (estimatedArrival) booking.estimatedArrival = estimatedArrival;
    if (actualArrival) booking.actualArrival = actualArrival;
    if (notes) booking.notes = notes;
    if (priority) booking.priority = priority;

    booking.updatedAt = Date.now();
    await booking.save();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'update_booking',
      entity: 'Booking',
      entityId: booking._id,
      details: { updatedFields: Object.keys(req.body) },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during booking update',
      error: error.message 
    });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

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

    await booking.deleteOne();

    // Log the action
    await Log.create({
      user: req.user._id,
      action: 'delete_booking',
      entity: 'Booking',
      entityId: booking._id,
      details: { batchNumber: booking.batchNumber },
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during booking deletion',
      error: error.message 
    });
  }
};

// Update booking location (for tracking)
exports.updateBookingLocation = async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    booking.currentLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
      speed,
      heading
    };

    booking.updatedAt = Date.now();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking location error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during location update',
      error: error.message 
    });
  }
};

// Get booking statistics
exports.getBookingStats = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };

    const totalBookings = await Booking.countDocuments(query);
    const pendingBookings = await Booking.countDocuments({ ...query, status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ ...query, status: 'confirmed' });
    const inTransitBookings = await Booking.countDocuments({ ...query, status: 'in_transit' });
    const deliveredBookings = await Booking.countDocuments({ ...query, status: 'delivered' });
    const cancelledBookings = await Booking.countDocuments({ ...query, status: 'cancelled' });

    const recentBookings = await Booking.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        inTransit: inTransitBookings,
        delivered: deliveredBookings,
        cancelled: cancelledBookings
      },
      recentBookings
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
