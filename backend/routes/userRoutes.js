import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createUser,
  getAllUsers,
  updateUser,
  toggleUserStatus,
  resetUserPassword
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', protect, adminOnly, createUser);
router.get('/', protect, adminOnly, getAllUsers);
router.put('/:id', protect, adminOnly, updateUser);
router.patch('/:id/status', protect, adminOnly, toggleUserStatus);
router.post('/:id/reset-password', protect, adminOnly, resetUserPassword);

export default router;
