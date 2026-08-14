'use strict';

const { timingSafeEqual } = require('node:crypto');

function secretEqual(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerFromHeader(value) {
  const header = String(value || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function acceptedRuntimeTokens(env = process.env) {
  return [...new Set([
    env.ARCSWEEP_RUNTIME_TOKEN,
    env.HEARTHGATE_GATEWAY_TOKEN,
  ].map((value) => String(value || '').trim()).filter(Boolean))];
}

function validateRuntimeToken(value, env = process.env) {
  const expected = acceptedRuntimeTokens(env);
  if (!expected.length) {
    return {
      ok: false,
      configured: false,
      reason: 'runtime-token-not-configured',
    };
  }
  const token = String(value || '').trim();
  const matched = expected.some((candidate) => secretEqual(token, candidate));
  return {
    ok: matched,
    configured: true,
    reason: matched ? null : 'runtime-token-invalid',
  };
}

function requireRuntimeToken(req, res, next) {
  const token = bearerFromHeader(req.headers?.authorization);
  const result = validateRuntimeToken(token, process.env);
  if (!result.configured) {
    return res.status(503).json({
      error: 'runtime-token-not-configured',
      message: 'Set ARCSWEEP_RUNTIME_TOKEN or HEARTHGATE_GATEWAY_TOKEN before privileged runtime actions.',
    });
  }
  if (!result.ok) {
    return res.status(401).json({
      error: 'runtime-token-required',
      message: 'A valid House runtime Bearer token is required for this action.',
    });
  }
  next();
}

module.exports = {
  secretEqual,
  bearerFromHeader,
  acceptedRuntimeTokens,
  validateRuntimeToken,
  requireRuntimeToken,
};
