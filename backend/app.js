const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB, mongoose } = require('./db');

dotenv.config();

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : {}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

function rootPayload() {
  return {
    name: 'TrackNow API',
    status: 'running',
    health: '/api/health',
    docs: 'Use /api/* endpoints from the admin or client app'
  };
}

/** No database — must run before DB middleware (Vercel preview opens `/`) */
app.get('/', (req, res) => res.json(rootPayload()));
app.get('/api', (req, res) => res.json(rootPayload()));

app.get('/api/health', (req, res) => {
  const onServerless = Boolean(
    process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  const host = process.env.VERCEL
    ? 'vercel'
    : process.env.NETLIFY
      ? 'netlify'
      : 'node';
  const dbReady = mongoose.connection.readyState === 1;
  res.json({
    status: 'OK',
    message: 'TrackNow API is running',
    host: onServerless ? host : 'node',
    database: dbReady ? 'connected' : 'not_connected_yet',
    features: ['vehicle-rental', 'user-invite', 'public-register', 'driver-management']
  });
});

let initPromise = null;

async function initApp() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await connectDB();
    const host = mongoose.connection.host || 'unknown';
    console.log(`MongoDB Connected (${host})`);

    const { runCleanup } = require('./utils/cleanupIndexes');
    await runCleanup(mongoose);

    const { expireStaleTrackerDays } = require('./utils/trackerExpiry');
    const n = await expireStaleTrackerDays();
    if (n > 0) console.log(`Auto-disabled ${n} expired tracker(s)`);

    if (!process.env.NETLIFY && !process.env.VERCEL) {
      const { startMonthlyBackupScheduler } = require('./jobs/scheduleMonthlyBackup');
      startMonthlyBackupScheduler();
    }
  })();

  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await initApp();
    next();
  } catch (err) {
    console.error('initApp failed:', err.message);
    res.status(503).json({
      error: 'Database unavailable',
      message: err.message,
      hint: !process.env.MONGODB_URI
        ? 'Set MONGODB_URI in Vercel Environment Variables'
        : 'Check MongoDB Atlas Network Access (0.0.0.0/0)'
    });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/batches', require('./routes/batches'));
const marketRatesRouter = require('./routes/marketrates');
app.use('/api/market-rates', marketRatesRouter);
app.use('/api/marketrates', marketRatesRouter);

const trackerRouter = require('./routes/tracker');
app.use('/api/tracker', trackerRouter);
app.use('/api/admin/tracker', trackerRouter);

app.use('/api/logs', require('./routes/logs'));

const { adminRouter: vehicleRentalAdmin, publicRouter: vehicleRentalPublic } = require('./routes/vehicleRental');
app.use('/api/admin/vehicle-rentals', vehicleRentalAdmin);
app.use('/api/public/vehicle-rental', vehicleRentalPublic);

const { publicRouter: userInvitePublic } = require('./routes/publicUserInvite');
app.use('/api/public/register-user', userInvitePublic);

const { adminRouter: driverAdmin, driverRouter: driverApp } = require('./routes/driverManagement');
app.use('/api/admin/driver', driverAdmin);
app.use('/api/driver', driverApp);

app.use('/api/admin', require('./routes/admin'));

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = { app, initApp };
