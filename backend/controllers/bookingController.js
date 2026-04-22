import Booking from '../models/Booking.js';
import writeLog from '../utils/logWriter.js';

export const createBooking = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { date, location, weight } = req.body;

    // Validate date is not in the past
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      res.status(400);
      throw new Error('Booking date cannot be in the past');
    }

    // Create booking
    const booking = new Booking({
      userId,
      date,
      location,
      weight,
      status: 'Pending'
    });

    await booking.save();

    // Log the action
    await writeLog(userId, 'Created a new booking', 'action');

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ date: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};
