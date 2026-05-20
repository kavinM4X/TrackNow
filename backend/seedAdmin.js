const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB Connected');

    // Delete old admin user if exists by email
    await User.deleteOne({ email: 'admin@tracknow.com' });

    // Check if admin already exists by phone
    const adminExists = await User.findOne({ phone: '7373144189' });
    
    if (adminExists) {
      console.log('Admin user already exists with phone');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@tracknow.com',
      phone: '7373144189',
      password: 'Senthil@33',
      role: 'admin',
      isActive: true
    });

    console.log('Admin user created successfully:');
    console.log('Phone: 7373144189');
    console.log('Password: Senthil@33');
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
