const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const Log = require('../models/Log');
const { normalizePhone } = require('../utils/phone');

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address, farmDetails, role } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Valid phone number is required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const allowedRoles = ['user', 'driver', 'staff'];
    const safeRole = allowedRoles.includes(role) ? role : 'user';

    const userExists = await User.findOne({ phone: normalizedPhone });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this phone number' 
      });
    }

    const user = await User.create({
      name: String(name).trim(),
      email,
      password,
      phone: normalizedPhone,
      address,
      farmDetails,
      role: safeRole
    });

    const isDriver = ['driver', 'staff'].includes(user.role);
    await Log.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: isDriver ? `driver registered (${user.role})` : `registered as ${user.role}`,
      type: 'login',
      page: isDriver ? 'driver-register' : 'register'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        farmDetails: user.farmDetails
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide phone and password' 
      });
    }

    const user = await User.findOne({ phone: normalizedPhone }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Your account has been disabled. Please contact admin.' 
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      const isDriver = ['driver', 'staff'].includes(user.role);
      await Log.create({
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        action: isDriver ? 'driver login failed (wrong password)' : 'Invalid password attempt',
        type: 'login',
        page: isDriver ? 'driver-login' : 'login'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    const isDriver = ['driver', 'staff'].includes(user.role);
    await Log.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: isDriver ? 'driver logged in' : 'logged in',
      type: 'login',
      page: isDriver ? 'driver-login' : 'login'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        farmDetails: user.farmDetails,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        farmDetails: user.farmDetails,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email, address, farmDetails } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email !== undefined && email !== '') {
      const normalized = String(email).toLowerCase().trim();
      const taken = await User.findOne({
        email: normalized,
        _id: { $ne: user._id }
      });
      if (taken) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = normalized;
    }
    if (address) user.address = address;
    if (farmDetails) user.farmDetails = { ...user.farmDetails, ...farmDetails };

    user.updatedAt = Date.now();
    await user.save();

    await Log.create({
      userId: user._id,
      userName: user.name,
      action: 'updated profile',
      type: 'login',
      page: 'profile'
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        farmDetails: user.farmDetails,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during profile update',
      error: error.message 
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide current and new password' 
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isPasswordMatch = await user.comparePassword(currentPassword);
    
    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();

    await Log.create({
      userId: user._id,
      userName: user.name,
      action: 'changed password',
      type: 'login',
      page: 'profile'
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during password change',
      error: error.message 
    });
  }
};
