const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB, mongoose } = require('./db');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { metricsCollector, getSystemMetrics } = require('./middleware/metrics');
const { idempotencyMiddleware } = require('./middleware/idempotency');

dotenv.config();

const app = express();

// Real-time Latency & Telemetry Metrics Collector
app.use(metricsCollector);

// Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);

// Global API Rate Limiting (300 req / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Strict Authentication Rate Limiter (20 attempts / 15 min per IP to prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});

// CORS Configuration
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    ...(corsOrigins.length ? { origin: corsOrigins } : {}),
    maxAge: 86400 // Cache CORS OPTIONS preflight for 24 hours (eliminates 100% preflight delays)
  })
);

app.use(express.json({ limit: '10mb' }));

// Sanitize incoming payloads to eliminate NoSQL query injections
app.use(mongoSanitize({ allowDots: true }));

// Apply rate limiting
app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/admin/driver/auth/', authLimiter);

// Idempotency Key Middleware for safe mobile retries
app.use(idempotencyMiddleware);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use((req, res, next) => {
  res.setHeader('Keep-Alive', 'timeout=60, max=1000');
  next();
});

function rootPayload() {
  return {
    name: 'TrackNow API',
    status: 'running',
    health: {
      live: '/api/health/live',
      ready: '/api/health/ready'
    },
    docs: 'Use /api/* endpoints from the admin, client, or driver portal'
  };
}

/** No database — must run before DB middleware (Vercel preview opens `/`) */
app.get('/', (req, res) => res.json(rootPayload()));
app.get('/api', (req, res) => res.json(rootPayload()));

// 1. Liveness Probe (checks if Node process is alive and responsive)
app.get('/api/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 2. Readiness Probe (checks if application dependencies and MongoDB are ready for traffic)
app.get('/api/health/ready', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not_ready',
        error: 'Database connecting or disconnected',
        state: mongoose.connection.readyState
      });
    }

    // Actively ping the database to ensure real connectivity & measure round-trip response
    const startPing = process.hrtime();
    await mongoose.connection.db.admin().ping();
    const diff = process.hrtime(startPing);
    const pingMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      dbPingLatencyMs: pingMs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      error: err.message
    });
  }
});

// Backward-compatible health check
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'OK' : 'DEGRADED',
    message: 'TrackNow API is running',
    database: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 3. Secured Metrics & Observability Endpoint (Admin / Monitoring credentials only)
const { protect } = require('./middleware/auth');
function metricsAuth(req, res, next) {
  if (process.env.METRICS_SECRET && req.headers['x-metrics-secret'] === process.env.METRICS_SECRET) {
    return next();
  }
  return protect(req, res, () => {
    if (['admin', 'master_admin'].includes(req.user?.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: Admin monitoring role required' });
  });
}
app.get('/api/metrics', metricsAuth, (req, res) => res.json(getSystemMetrics()));

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
