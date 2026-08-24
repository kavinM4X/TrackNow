/**
 * Debug script to check bookings in the database
 * Run with: node backend/scripts/checkBookings.js
 */

require('dotenv').config();
const { connectDB, mongoose } = require('../db');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function checkBookings() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');
    console.log('Database:', mongoose.connection.name);
    console.log('');

    // Count all bookings
    const totalBookings = await Booking.countDocuments({});
    console.log(`Total bookings in database: ${totalBookings}`);
    
    if (totalBookings === 0) {
      console.log('\n⚠️  NO BOOKINGS FOUND IN DATABASE!');
      console.log('This explains why the admin panel shows no data.');
      console.log('\nPossible causes:');
      console.log('1. Bookings are being saved to a different database');
      console.log('2. The MONGODB_URI environment variable is different between client and admin');
      console.log('3. Bookings were never actually saved');
      
      // Check if there are any users
      const totalUsers = await User.countDocuments({});
      console.log(`\nTotal users in database: ${totalUsers}`);
      
      process.exit(0);
    }

    // Count by status
    const pending = await Booking.countDocuments({ status: 'pending' });
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    const completed = await Booking.countDocuments({ status: 'completed' });
    const cancelled = await Booking.countDocuments({ status: 'cancelled' });
    
    console.log('\nBookings by status:');
    console.log(`  Pending: ${pending}`);
    console.log(`  Confirmed: ${confirmed}`);
    console.log(`  Completed: ${completed}`);
    console.log(`  Cancelled: ${cancelled}`);

    // Show sample bookings
    console.log('\n--- Sample Bookings ---');
    const sampleBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    for (const booking of sampleBookings) {
      console.log(`\nBooking ID: ${booking._id}`);
      console.log(`  User ID: ${booking.userId}`);
      console.log(`  User Name: ${booking.userName}`);
      console.log(`  Date: ${booking.date}`);
      console.log(`  Location: ${booking.location}`);
      console.log(`  Quantity: ${booking.quantityKg} kg`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Created: ${booking.createdAt}`);
    }

    // Test the admin query
    console.log('\n--- Testing Admin Query ---');
    const adminQuery = { status: { $ne: 'cancelled' } };
    console.log('Query:', JSON.stringify(adminQuery));
    
    const adminBookings = await Booking.find(adminQuery)
      .populate('userId', 'name phone')
      .sort({ date: -1, createdAt: -1 })
      .lean();
    
    console.log(`Results: ${adminBookings.length} bookings`);
    
    if (adminBookings.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(adminBookings[0], null, 2));
    }

    // Check for orphaned bookings (userId doesn't exist)
    console.log('\n--- Checking for orphaned bookings ---');
    const allBookings = await Booking.find({}).lean();
    const userIds = [...new Set(allBookings.map(b => b.userId.toString()))];
    
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) {
        const orphanedCount = allBookings.filter(b => b.userId.toString() === userId).length;
        console.log(`⚠️  Found ${orphanedCount} booking(s) with non-existent userId: ${userId}`);
      }
    }

    console.log('\n✓ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBookings();
