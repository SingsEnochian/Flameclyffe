'use strict';

const { createPublicKey, verify } = require('node:crypto');

function accessConfiguration(env) {
  const issuer = env.WAYGLASS_ACCESS_ISSUER;
  const audience = env.WAYGLASS_ACCESS_AUDIENCE;
  const owner = env.WAYGLASS_ACCESS_OWNER_EMAIL?.trim().toLowerCase();
  const origin = env.WAYGLASS_ACCESS_PUBLIC_ORIGIN;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') || !audience || !owner) return null;
  try {
    if (new URL(origin).origin !== origin || !origin.startsWith('https://')) return null;
  } catch { return null; }
  return { issuer, audience, owner, origin };
}

function createAccessVerifier(config, { fetchImpl = fetch, clock = Date.now } = {}) {
  let cached = null;
  let pending = null;
  async function keys() {
    if (cached && cached.until > clock()) return cached.keys;
    pending ||= (async () => {
      const response = await fetchImpl(config.issuer + '/cdn-cgi/access/certs', {
        redirect: 'error', signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error('Access signing keys unavailable.');
      const { keys } = await response.json();
      if (!Array.isArray(keys)) throw new Error('Access signing keys invalid.');
      cached = { keys, until: clock() + 60_000 };
      return keys;
    })().finally(() => { pending = null; });
    return pending;
  }
  return async function verifyOwner(token) {
    if (typeof token !== 'string' || token.length > 8192 ||
        !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
    const [encodedHeader, encodedClaims, signature] = token.split('.');
    let header, claims;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, 'base64url'));
      claims = JSON.parse(Buffer.from(encodedClaims, 'base64url'));
    } catch { return null; }
    if (header?.alg !== 'RS256' || typeof header.kid !== 'string' ||
        claims?.type !== 'app' || claims.iss !== config.issuer ||
        !Array.isArray(claims.aud) || !claims.aud.includes(config.audience) ||
        typeof claims.email !== 'string' || claims.email.toLowerCase() !== config.owner ||
        typeof claims.sub !== 'string' || !claims.sub || !Number.isSafeInteger(claims.exp) ||
        !Number.isSafeInteger(claims.iat)) return null;
    const matches = (await keys()).filter(key => key?.kid === header.kid && key.kty === 'RSA' &&
      (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
    if (matches.length !== 1) return null;
    const now = Math.floor(clock() / 1000);
    if (claims.exp <= now || claims.iat > now + 30 ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now))) return null;
    try {
      const key = createPublicKey({ key: matches[0], format: 'jwk' });
      return verify('RSA-SHA256', Buffer.from(encodedHeader + '.' + encodedClaims), key,
        Buffer.from(signature, 'base64url')) ? { expiresAt: claims.exp } : null;
    } catch { return null; }
  };
}

module.exports = { accessConfiguration, createAccessVerifier };
