/**
 * Idempotency Key Middleware for TrackNow API
 * Prevents duplicate bookings, duplicate expense entries, and duplicate state mutations
 * when mobile/client networks retry failed or slow HTTP requests.
 */

const idempotencyStore = new Map();
const MAX_ENTRIES = 10000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodically clean up expired idempotency keys
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (value.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

function idempotencyMiddleware(req, res, next) {
  // Only apply to state-mutating requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  const userPrefix = req.user?.id || req.user?._id || 'anon';
  const fullKey = `${userPrefix}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;

  const cached = idempotencyStore.get(fullKey);

  // If already processed and cached response exists
  if (cached) {
    if (cached.inFlight) {
      return res.status(409).json({
        error: 'A request with this Idempotency-Key is currently in-flight. Please wait.'
      });
    }

    res.set('X-Cache-Lookup', 'IDEMPOTENT_HIT');
    return res.status(cached.statusCode).json(cached.body);
  }

  // Prevent memory exhaustion
  if (idempotencyStore.size >= MAX_ENTRIES) {
    // Delete oldest entry
    const oldestKey = idempotencyStore.keys().next().value;
    if (oldestKey) idempotencyStore.delete(oldestKey);
  }

  // Mark as in-flight
  idempotencyStore.set(fullKey, {
    inFlight: true,
    expiresAt: Date.now() + TTL_MS
  });

  // Intercept json() response to cache the result
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful or client error statuses (2xx, 4xx). Don't cache 5xx server crashes.
    if (res.statusCode < 500) {
      idempotencyStore.set(fullKey, {
        inFlight: false,
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + TTL_MS
      });
    } else {
      idempotencyStore.delete(fullKey);
    }
    return originalJson(body);
  };

  next();
}

module.exports = { idempotencyMiddleware, idempotencyStore };
