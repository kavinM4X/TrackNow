import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { getAllLogs } from '../controllers/logsController.js';

const router = express.Router();

router.get('/', protect, adminOnly, getAllLogs);

export default router;
