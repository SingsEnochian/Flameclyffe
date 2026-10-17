'use strict';

/**
 * Host-issued AR anchor envelope. This is a cryptographic building block,
 * not a browser permission, user identity registry, or spatial-write endpoint.
 * A trusted host must bind principal_id to the authenticated caller and keep
 * the Ed25519 signing key private. Public keys come from a trusted registry,
 * never from the candidate message.
 *
 * A successful signature alone must not place an anchor in a room:
 * acceptSignedArAnchor requires an atomic durable anti-replay claim.
 */
const { sign, verify } = require('node:crypto');

const SCHEMA = 'wayglass.ar.signed-anchor/v0.1';
const DOMAIN = Buffer.from('WAYGLASS-AR-ANCHOR/v0.1\n', 'utf8');
const MAX_TTL_MS = 10 * 60 * 1000;
const ID = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const FIELDS = Object.freeze([
  'schema', 'world_id', 'anchor_id', 'frame_id', 'position',
  'principal_id', 'issuer', 'revision', 'nonce', 'issued_at', 'expires_at',
]);
const exactFields = (obj, fields) => Object.keys(obj).length === fields.length
  && fields.every(key => Object.hasOwn(obj, key));
const validId = value => typeof value === 'string' && ID.test(value);
const validTime = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;

function validateAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor) || !exactFields(anchor, FIELDS)) {
    throw new TypeError('AR anchor has an invalid field set.');
  }
  if (anchor.schema !== SCHEMA
      || !['world_id', 'anchor_id', 'frame_id', 'principal_id', 'issuer', 'nonce'].every(
        key => validId(anchor[key])
      )
      || !Array.isArray(anchor.position) || anchor.position.length !== 3
      || !anchor.position.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000)
      || !Number.isSafeInteger(anchor.revision) || anchor.revision < 1
      || !validTime(anchor.issued_at) || !validTime(anchor.expires_at)) {
    throw new TypeError('AR anchor is invalid or unbounded.');
  }
  const ttl = Date.parse(anchor.expires_at) - Date.parse(anchor.issued_at);
  if (ttl <= 0 || ttl > MAX_TTL_MS) throw new TypeError('AR anchor lifetime exceeds the bound.');
  return anchor;
}

function canonicalAnchor(anchor) {
  validateAnchor(anchor);
  return Buffer.concat([DOMAIN, Buffer.from(JSON.stringify([
    anchor.schema, anchor.world_id, anchor.anchor_id, anchor.frame_id,
    anchor.position, anchor.principal_id, anchor.issuer, anchor.revision,
    anchor.nonce, anchor.issued_at, anchor.expires_at,
  ]), 'utf8')]);
}

function signArAnchor(anchor, { privateKey } = {}) {
  if (!privateKey) throw new TypeError('Host private signing key required.');
  const payload = Object.fromEntries(FIELDS.map(field => [field, anchor?.[field]]));
  validateAnchor(payload);
  const signature = sign(null, canonicalAnchor(payload), privateKey).toString('base64url');
  return Object.freeze({ ...payload, position: Object.freeze([...payload.position]), signature });
}

function verifySignedArAnchor(candidate, {
  publicKey, trustedIssuer, worldId, now = Date.now(),
} = {}) {
  if (!publicKey || !validId(trustedIssuer) || !validId(worldId)) {
    throw new TypeError('Trusted host key, issuer and target world required.');
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
    || !exactFields(candidate, [...FIELDS, 'signature'])) return false;
  const { signature, ...payload } = candidate;
  if (typeof signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(signature)) return false;
  try {
    validateAnchor(payload);
    if (payload.world_id !== worldId || payload.issuer !== trustedIssuer) return false;
    if (!Number.isSafeInteger(now) || now < Date.parse(payload.issued_at) - 10_000
      || now > Date.parse(payload.expires_at)) return false;
    return verify(null, canonicalAnchor(payload), publicKey, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}

/**
 * claim must atomically persist (issuer,world_id,anchor_id,revision,nonce)
 * and reject used nonces, stale revisions and revoked anchors. It must be a
 * host-side durable transaction, not a browser Set or signature claim.
 */
async function acceptSignedArAnchor(candidate, options = {}) {
  if (typeof options.claim !== 'function') {
    throw new TypeError('Durable atomic anchor claim callback required.');
  }
  if (!verifySignedArAnchor(candidate, options)) return false;
  return (await options.claim(candidate)) === true;
}

module.exports = {
  SCHEMA, MAX_TTL_MS, canonicalAnchor, signArAnchor, verifySignedArAnchor, acceptSignedArAnchor,
};
