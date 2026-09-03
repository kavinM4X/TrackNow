const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Booking = require('../models/Booking');

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const users = await User.find({ name: { $regex: /sundara/i } });
  console.log('Matching Users:', users.map(u => ({ id: u._id, name: u.name, phone: u.phone, role: u.role })));

  const allBookings = await Booking.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('Latest 10 Bookings in DB:', allBookings.map(b => ({
    id: b._id,
    userId: b.userId,
    userName: b.userName,
    date: b.date,
    status: b.status,
    location: b.location,
    quantityKg: b.quantityKg
  })));

  for (const user of users) {
    const bookings = await Booking.find({ $or: [{ userId: user._id }, { userName: user.name }] });
    console.log(`\n=== User: ${user.name} (${user._id}) ===`);
    console.log('All Bookings for user:', bookings.map(b => ({
      id: b._id,
      userId: b.userId,
      date: b.date,
      status: b.status,
      quantityKg: b.quantityKg
    })));

    const today = new Date().toISOString().split('T')[0];
    console.log('Today ISO:', today);

    // Exact query used in /api/bookings/upcoming
    const upcoming = await Booking.findOne({
      userId: user._id,
      status: { $in: ['pending', 'confirmed', 'in_transit'] },
      date: { $gte: today }
    }).sort({ date: 1 });
    console.log(`Upcoming query result for ${user.name}:`, upcoming);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
