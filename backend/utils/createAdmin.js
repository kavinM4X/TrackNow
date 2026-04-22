import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@tracknow.com' });

    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create new admin user
    const admin = new User({
      name: 'Admin',
      email: 'admin@tracknow.com',
      password: 'Admin123',
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('Admin user created successfully');
    console.log(`Email: admin@tracknow.com`);
    console.log(`Password: Admin123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
