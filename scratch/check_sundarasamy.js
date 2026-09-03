const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Booking = require('../backend/models/Booking');

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const users = await User.find({ name: { $regex: /sundara/i } });
  console.log('Matching Users:', users.map(u => ({ id: u._id, name: u.name, phone: u.phone, role: u.role })));

  for (const user of users) {
    const bookings = await Booking.find({ $or: [{ userId: user._id }, { userName: user.name }] });
    console.log(`Bookings for user ${user.name} (${user._id}):`, bookings);

    const today = new Date().toISOString().split('T')[0];
    console.log('Today ISO:', today);

    // Exact query used in /api/bookings/upcoming
    const upcoming = await Booking.findOne({
      userId: user._id,
      status: { $in: ['pending', 'confirmed', 'in_transit'] },
      date: { $gte: today }
    }).sort({ date: 1 });
    console.log(`Upcoming query result for ${user.name}:`, upcoming);

    // Any active booking
    const anyActive = await Booking.findOne({
      userId: user._id,
      status: { $in: ['pending', 'confirmed', 'in_transit'] }
    }).sort({ date: -1 });
    console.log(`Any active booking result for ${user.name}:`, anyActive);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
