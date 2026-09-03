/**
 * Distributed & Atomic Idempotency Middleware for TrackNow
 * Uses MongoDB unique compound index to guarantee distributed atomicity across multiple server instances.
 * Prevents race conditions and duplicate operations when clients retry network requests.
 */

const IdempotencyKey = require('../models/IdempotencyKey');

async function idempotencyMiddleware(req, res, next) {
  // Only apply to state-mutating requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  const userId = String(req.user?.id || req.user?._id || 'anon');
  const method = req.method;
  const path = `${req.baseUrl || ''}${req.path}`;

  try {
    // 1. Try to atomically acquire lock by inserting the in_flight record
    let isNewLock = false;
    let existingRecord = null;

    try {
      await IdempotencyKey.create({
        key: idempotencyKey,
        userId,
        method,
        path,
        status: 'in_flight'
      });
      isNewLock = true;
    } catch (err) {
      // Duplicate key error (E11000): Key already acquired or completed
      if (err.code === 11000) {
        existingRecord = await IdempotencyKey.findOne({ key: idempotencyKey, userId, method, path }).lean();
      } else {
        console.error('Idempotency record creation error:', err.message);
        return next(); // Fail open on non-conflict DB errors
      }
    }

    if (!isNewLock && existingRecord) {
      if (existingRecord.status === 'in_flight') {
        res.set('Retry-After', '2');
        return res.status(409).json({
          error: 'A concurrent request with this Idempotency-Key is currently in-flight. Please wait.'
        });
      }

      if (existingRecord.status === 'completed' && existingRecord.statusCode) {
        res.set('X-Idempotency', 'HIT');
        return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
      }
    }

    // 2. Intercept response to atomically save completed status and response payload
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache 2xx and 4xx responses. On 5xx server crashes, release the lock so caller can safely retry.
      if (res.statusCode < 500) {
        IdempotencyKey.findOneAndUpdate(
          { key: idempotencyKey, userId, method, path },
          {
            $set: {
              status: 'completed',
              statusCode: res.statusCode,
              responseBody: body
            }
          }
        ).catch((saveErr) => console.warn('Idempotency save error:', saveErr.message));
      } else {
        IdempotencyKey.deleteOne({ key: idempotencyKey, userId, method, path }).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('Idempotency middleware unhandled error:', err);
    next();
  }
}

module.exports = { idempotencyMiddleware };
