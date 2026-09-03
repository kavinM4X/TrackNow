/**
 * Distributed & Atomic Idempotency Middleware for TrackNow
 * 
 * Guarantees:
 * 1. Distributed Atomicity: Uses MongoDB compound unique constraint across multi-node clusters.
 * 2. Payload Fingerprinting: Hashes request payload (SHA-256) to detect and reject altered body replays (409 Conflict).
 * 3. Safe Failure Semantics: Transitions to 'failed' on 5xx errors instead of deleting locks to preserve audit trail.
 * 4. In-Flight Guard: Prevents race-conditions with 409 Conflict & Retry-After header.
 */

const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

function hashPayload(body) {
  const serialized = typeof body === 'object' ? JSON.stringify(body || {}) : String(body || '');
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

async function idempotencyMiddleware(req, res, next) {
  // Only apply to state-mutating HTTP methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    return next();
  }

  const idempotencyKey = rawKey.trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return res.status(400).json({
      error: 'Invalid Idempotency-Key header: length must be between 8 and 128 characters'
    });
  }

  const userId = String(req.user?.id || req.user?._id || 'anon');
  const method = req.method;
  const path = `${req.baseUrl || ''}${req.path}`;
  const payloadHash = hashPayload(req.body);

  try {
    let isNewLock = false;
    let existingRecord = null;

    // 1. Atomic Lock Acquisition
    try {
      await IdempotencyKey.create({
        key: idempotencyKey,
        userId,
        method,
        path,
        requestPayloadHash: payloadHash,
        status: 'in_flight'
      });
      isNewLock = true;
    } catch (err) {
      if (err.code === 11000) {
        existingRecord = await IdempotencyKey.findOne({ key: idempotencyKey, userId, method, path }).lean();
      } else {
        console.error('Idempotency creation error:', err.message);
        return next(); // Fail open on non-conflict DB errors
      }
    }

    if (!isNewLock && existingRecord) {
      // Payload tampering detection
      if (existingRecord.requestPayloadHash && existingRecord.requestPayloadHash !== payloadHash) {
        return res.status(409).json({
          error: 'Idempotency-Key Conflict: Key already used with a different request payload body.'
        });
      }

      // In-flight concurrency lock
      if (existingRecord.status === 'in_flight') {
        res.set('Retry-After', '2');
        return res.status(409).json({
          error: 'A concurrent request with this Idempotency-Key is currently in-flight. Please wait.'
        });
      }

      // Successful completion cache hit
      if (existingRecord.status === 'completed' && existingRecord.statusCode) {
        res.set('X-Idempotency', 'HIT');
        return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
      }

      // Failed state
      if (existingRecord.status === 'failed') {
        return res.status(422).json({
          error: 'Previous request with this Idempotency-Key failed execution. Please generate a new key.',
          details: existingRecord.errorDetails
        });
      }
    }

    // 2. Intercept Response to update status
    const originalJson = res.json.bind(res);
    res.json = (body) => {
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
        // Transition to 'failed' state instead of deleting
        IdempotencyKey.findOneAndUpdate(
          { key: idempotencyKey, userId, method, path },
          {
            $set: {
              status: 'failed',
              statusCode: res.statusCode,
              errorDetails: 'Server encountered internal processing error'
            }
          }
        ).catch(() => {});
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
