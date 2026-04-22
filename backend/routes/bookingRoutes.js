import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createBooking,
  getUserBookings,
  getAllBookings
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getUserBookings);
router.get('/', protect, adminOnly, getAllBookings);

export default router;
