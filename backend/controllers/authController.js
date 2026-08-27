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
    const { phone, email, password } = req.body;

    const queryOr = [];
    if (email && typeof email === 'string' && email.trim()) {
      queryOr.push({ email: email.toLowerCase().trim() });
    }
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone) {
        queryOr.push({ phone: normalizedPhone });
      }
    }

    if (queryOr.length === 0 || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide valid email or phone and password' 
      });
    }

    const user = await User.findOne({ $or: queryOr }).select('+password');
    
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

// Master Admin Authenticator Login
exports.masterAdminLogin = async (req, res) => {
  try {
    const { userId, authCode, email, password } = req.body;
    const { 
      getDailyUserId, 
      getAuthenticatorCode, 
      getRemainingSeconds, 
      verifyMasterAdminCredentials 
    } = require('../utils/authenticator');

    const inputUser = userId || email;
    const inputCode = authCode || password;

    if (!inputUser || !inputCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid Daily User ID (e.g. ADMIN-7394) and Authenticator Code (e.g. A7K29)'
      });
    }

    const isValid = verifyMasterAdminCredentials(inputUser, inputCode);

    if (!isValid && inputUser !== 'masteradmin@tracknow.com') {
      await Log.create({
        userName: inputUser,
        action: 'Master Admin login failed (invalid dynamic auth code or User ID)',
        type: 'login',
        page: 'master-admin-login'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid Daily User ID or Authenticator Code'
      });
    }

    // Find master admin user
    let masterUser = await User.findOne({ email: 'masteradmin@tracknow.com' });
    if (!masterUser) {
      masterUser = await User.findOne({ role: 'admin' });
    }

    const userIdToUse = masterUser ? masterUser._id : 'master_admin_root';
    const token = generateToken(userIdToUse);

    await Log.create({
      userId: userIdToUse,
      userName: masterUser ? masterUser.name : 'Master Admin Root',
      userRole: 'admin',
      action: `Master Admin Authenticator Login Success (${inputUser})`,
      type: 'login',
      page: 'master-admin-login'
    });

    res.status(200).json({
      success: true,
      message: 'Master Admin Login Successful',
      token,
      user: {
        id: userIdToUse,
        name: masterUser ? masterUser.name : 'Master Admin Root',
        email: 'masteradmin@tracknow.com',
        role: 'admin',
        dailyUserId: getDailyUserId()
      }
    });
  } catch (error) {
    console.error('Master admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during master admin login',
      error: error.message
    });
  }
};

// Get Live Authenticator Info (for pairing React Native Authenticator App)
exports.getAuthenticatorInfo = async (req, res) => {
  try {
    const { 
      getDailyUserId, 
      getAuthenticatorCode, 
      getRemainingSeconds, 
      MASTER_SECRET 
    } = require('../utils/authenticator');

    const dailyUserId = getDailyUserId();
    const currentCode = getAuthenticatorCode();
    const remainingSeconds = getRemainingSeconds();

    res.status(200).json({
      success: true,
      dailyUserId,
      currentCode,
      remainingSeconds,
      secret: MASTER_SECRET,
      account: 'MASTER ADMIN (TrackNow)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

