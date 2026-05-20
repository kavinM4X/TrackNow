const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
const { runCleanup } = require('./utils/cleanupIndexes');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    const host = mongoose.connection.host || 'unknown';
    console.log(`MongoDB Connected (${host})`);
    await runCleanup(mongoose);
    const { expireStaleTrackerDays } = require('./utils/trackerExpiry');
    const n = await expireStaleTrackerDays();
    if (n > 0) console.log(`Auto-disabled ${n} expired tracker(s)`);

    const { startMonthlyBackupScheduler } = require('./jobs/scheduleMonthlyBackup');
    startMonthlyBackupScheduler();
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    if (mongoUri.includes('mongodb+srv')) {
      console.error('Atlas tip: check IP whitelist, username/password, and database name in MONGODB_URI.');
    }
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/batches', require('./routes/batches'));
const marketRatesRouter = require('./routes/marketrates');
app.use('/api/market-rates', marketRatesRouter);
app.use('/api/marketrates', marketRatesRouter);

const trackerRouter = require('./routes/tracker');
app.use('/api/tracker', trackerRouter);
app.use('/api/admin/tracker', trackerRouter);

app.use('/api/logs', require('./routes/logs'));
app.use('/api/admin', require('./routes/admin'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TrackNow API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
