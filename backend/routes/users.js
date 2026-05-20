const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getUserStats
} = require('../controllers/userController');

// All routes are admin only
router.get('/', protect, adminOnly, getAllUsers);
router.get('/stats', protect, adminOnly, getUserStats);
router.get('/:id', protect, adminOnly, getUserById);
router.post('/', protect, adminOnly, createUser);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/reset-password', protect, adminOnly, resetPassword);

module.exports = router;
