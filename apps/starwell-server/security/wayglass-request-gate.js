'use strict';

/**
 * Small, bounded, in-process guard for private Wayglass HTTP entrances.
 *
 * A Cloudflare tunnel can make unrelated callers appear as the same local
 * socket peer. Never use a caller-supplied X-Forwarded-For value as an
 * authenticated identity or to create unlimited attacker-controlled buckets.
 *
 * This gate protects expensive verification, pairing and provider operations.
 * It does not replace owner authentication, durable audit trails or edge WAF.
 */
function createRequestGate({
  maxRequests,
  windowMs = 60_000,
  maxConcurrent = 4,
  clock = Date.now,
} = {}) {
  if (!Number.isSafeInteger(maxRequests) || maxRequests < 1
      || !Number.isSafeInteger(windowMs) || windowMs < 1
      || !Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1
      || typeof clock !== 'function') {
    throw new TypeError('Wayglass request gate requires positive bounded settings.');
  }
  let windowStart = clock();
  let count = 0;
  let pending = 0;

  return function wayglassRequestGate(_req, res, next) {
    const now = clock();
    if (now < windowStart || now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }

    if (count >= maxRequests || pending >= maxConcurrent) {
      const retrySeconds = count >= maxRequests
        ? Math.max(1, Math.ceil((windowMs - (now - windowStart)) / 1000))
        : 1;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', String(retrySeconds));
      return res.status(429).json({
        error: 'Wayglass request limit reached. Wait briefly before trying again.',
      });
    }

    count++;
    pending++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      pending = Math.max(0, pending - 1);
      res.removeListener('finish', release);
      res.removeListener('close', release);
    };
    res.once('finish', release);
    res.once('close', release);
    try { return next(); } catch (error) { release(); throw error; }
  };
}

module.exports = { createRequestGate };
