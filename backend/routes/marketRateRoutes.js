import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  publishRate,
  getLatestRates,
  getRateHistory
} from '../controllers/marketRateController.js';

const router = express.Router();

router.post('/', protect, adminOnly, publishRate);
router.get('/latest', protect, getLatestRates);
router.get('/', protect, adminOnly, getRateHistory);

export default router;
