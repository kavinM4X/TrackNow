/**
 * Observability & Telemetry Middleware for TrackNow API
 * Tracks real-time p50, p95, p99 request latency, throughput, error rates, and normalized route metrics.
 * Uses a bounded sliding window to ensure fixed, minimal memory footprint.
 */

const mongoose = require('mongoose');
const { monitorEventLoopDelay } = require('perf_hooks');

const eventLoopHistogram = monitorEventLoopDelay({ resolution: 10 });
eventLoopHistogram.enable();

const MAX_SAMPLES = 5000;
const latencySamples = [];
let totalRequests = 0;
const statusDistribution = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
const endpointLatencyMap = new Map();

/**
 * Normalizes dynamic URL parameters (Mongo ObjectIDs, UUIDs, numeric IDs)
 * to prevent high-cardinality label explosion.
 * Example: /api/bookings/65e8a1f2b3c4d5e6 -> /api/bookings/:id
 */
function normalizeRoute(path) {
  if (!path) return '/';
  return path
    .replace(/\/[0-9a-fA-F]{24}(\/|$)/g, '/:id$1') // MongoDB ObjectIds (24 hex chars)
    .replace(/\/[0-9a-fA-F-]{36}(\/|$)/g, '/:uuid$1') // UUIDs (36 chars)
    .replace(/\/\d{4}-\d{2}-\d{2}(\/|$)/g, '/:date$1') // YYYY-MM-DD dates
    .replace(/\/\d+(\/|$)/g, '/:id$1'); // Numeric IDs
}

function calculatePercentiles(samples) {
  if (samples.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const len = sorted.length;

  const p50 = sorted[Math.floor(len * 0.50)];
  const p95 = sorted[Math.floor(len * 0.95)] || sorted[len - 1];
  const p99 = sorted[Math.floor(len * 0.99)] || sorted[len - 1];
  const avg = Math.round((sorted.reduce((a, b) => a + b, 0) / len) * 10) / 10;
  const min = sorted[0];
  const max = sorted[len - 1];

  return { p50, p95, p99, avg, min, max };
}

function metricsCollector(req, res, next) {
  const start = process.hrtime();
  totalRequests++;

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    // Bounded sliding window
    latencySamples.push(durationMs);
    if (latencySamples.length > MAX_SAMPLES) {
      latencySamples.shift();
    }

    // Status code bucketing
    const category = `${Math.floor(res.statusCode / 100)}xx`;
    if (statusDistribution[category] !== undefined) {
      statusDistribution[category]++;
    }

    // Normalized route tracking
    const rawPath = `${req.baseUrl || ''}${req.path || ''}`;
    const normalized = normalizeRoute(rawPath);
    const routeKey = `${req.method} ${normalized}`;

    if (!endpointLatencyMap.has(routeKey)) {
      if (endpointLatencyMap.size < 200) {
        endpointLatencyMap.set(routeKey, { count: 0, totalMs: 0, samples: [] });
      }
    }

    const endpointData = endpointLatencyMap.get(routeKey);
    if (endpointData) {
      endpointData.count++;
      endpointData.totalMs += durationMs;
      endpointData.samples.push(durationMs);
      if (endpointData.samples.length > 200) endpointData.samples.shift();
    }
  });

  next();
}

function getSystemMetrics() {
  const overallLatency = calculatePercentiles(latencySamples);
  const memory = process.memoryUsage();

  const endpointBreakdown = [];
  for (const [route, data] of endpointLatencyMap.entries()) {
    endpointBreakdown.push({
      route,
      count: data.count,
      avgMs: Math.round((data.totalMs / (data.count || 1)) * 10) / 10,
      ...calculatePercentiles(data.samples)
    });
  }

  endpointBreakdown.sort((a, b) => b.count - a.count);

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    traffic: {
      totalRequests,
      statusCodes: statusDistribution,
      errorRate: totalRequests > 0 
        ? `${(((statusDistribution['4xx'] + statusDistribution['5xx']) / totalRequests) * 100).toFixed(2)}%`
        : '0%'
    },
    latency: {
      samplesCollected: latencySamples.length,
      p50Ms: overallLatency.p50,
      p95Ms: overallLatency.p95,
      p99Ms: overallLatency.p99,
      avgMs: overallLatency.avg,
      minMs: overallLatency.min,
      maxMs: overallLatency.max
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host || 'MongoDB Atlas',
      name: mongoose.connection.name || 'tracknow'
    },
    memory: {
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100
    },
    eventLoopLag: {
      p50Ms: Math.round((eventLoopHistogram.percentile(50) / 1e6) * 100) / 100,
      p95Ms: Math.round((eventLoopHistogram.percentile(95) / 1e6) * 100) / 100,
      p99Ms: Math.round((eventLoopHistogram.percentile(99) / 1e6) * 100) / 100,
      meanMs: Math.round((eventLoopHistogram.mean / 1e6) * 100) / 100,
      maxMs: Math.round((eventLoopHistogram.max / 1e6) * 100) / 100
    },
    topEndpoints: endpointBreakdown.slice(0, 15)
  };
}

module.exports = { metricsCollector, getSystemMetrics };
