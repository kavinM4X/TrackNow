import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getMyTracker,
  updateTracker
} from '../controllers/trackerController.js';

const router = express.Router();

router.get('/my', protect, getMyTracker);
router.patch('/:userId', protect, adminOnly, updateTracker);

export default router;
