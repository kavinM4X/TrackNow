import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createBatch,
  getUserBatches,
  getAllBatches
} from '../controllers/batchController.js';

const router = express.Router();

router.post('/', protect, adminOnly, createBatch);
router.get('/user/:id', protect, getUserBatches);
router.get('/', protect, adminOnly, getAllBatches);

export default router;
