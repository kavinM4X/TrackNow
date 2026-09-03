const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Booking = require('../models/Booking');
const Batch = require('../models/Batch');

async function testUpcomingEndpointLogic() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';
  await mongoose.connect(uri);

  const uid = new mongoose.Types.ObjectId('6a9926f8e14408c79b282213'); // sundarasamy
  const today = '2026-09-03';

  // Step 1: upcoming non-cancelled booking on or after today
  let booking = await Booking.findOne({
    userId: uid,
    status: { $ne: 'cancelled' },
    date: { $gte: today }
  }).sort({ date: 1 }).lean();

  console.log('Step 1 Result for sundarasamy:', booking);

  if (!booking) {
    const lastBooking = await Booking.findOne({ userId: uid }).sort({ date: -1 }).lean();
    const hasBatch = await Batch.exists({ userId: uid });
    if (lastBooking || hasBatch) {
      booking = {
        _id: lastBooking?._id || 'cleared',
        date: lastBooking?.date || today,
        status: lastBooking?.status || 'completed',
        isExistingFarmer: true
      };
    }
  }

  console.log('Final /upcoming Output for sundarasamy:', booking);

  await mongoose.disconnect();
}

testUpcomingEndpointLogic().catch(console.error);
