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

app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.json({
    name: 'TrackNow API',
    status: 'running',
    health: '/api/health',
    docs: 'Use /api/* endpoints from the admin or client app'
  });
});

app.get('/api/health', (req, res) => {
  const onServerless = Boolean(
    process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
  );
  const host = process.env.VERCEL
    ? 'vercel'
    : process.env.NETLIFY
      ? 'netlify'
      : 'node';
  res.json({
    status: 'OK',
    message: 'TrackNow API is running',
    host: onServerless ? host : 'node',
    features: ['vehicle-rental', 'user-invite', 'public-register']
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

    // node-cron does not run on serverless (Netlify/Vercel); use BACKUP_ENABLED=false or external cron
    if (!process.env.NETLIFY && !process.env.VERCEL) {
      const { startMonthlyBackupScheduler } = require('./jobs/scheduleMonthlyBackup');
      startMonthlyBackupScheduler();
    }
  })();

  return initPromise;
}

module.exports = { app, initApp };
