'use strict';

// Deployment adapter: introspection is performed by an independently trusted
// authorization-server client. This module never decodes or trusts token claims
// locally, and never treats scope possession as an owner grant.
function identifier(value, maximum = 1024) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value);
}
const SCOPES = new Set(['wayglass:constellation', 'wayglass:bluebird']);
function createIntrospectionBearerVerifier({ introspect, issuer, audience, ownerSubject, now = () => Date.now() / 1000 } = {}) {
  if (typeof introspect !== 'function') throw new TypeError('Trusted introspection callback required');
  if (![issuer, audience, ownerSubject].every(v => identifier(v))) {
    throw new TypeError('Issuer, audience and owner subject are required');
  }
  return async function verifyBearer(token, { resource, requiredScope } = {}) {
    if (typeof token !== 'string' || !token || Buffer.byteLength(token) > 8192 || /[\u0000-\u0020\u007f]/.test(token) || resource !== audience || !SCOPES.has(requiredScope)) return null;
    let claims;
    try { claims = await introspect(token); } catch { return null; }
    if (!claims || typeof claims !== 'object' || Array.isArray(claims) || claims.active !== true || claims.iss !== issuer || claims.sub !== ownerSubject) return null;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.length || aud.some(value => !identifier(value)) || !aud.includes(audience)) return null;
    let clock;
    try { clock = now(); } catch { return null; }
    if (claims.token_type !== undefined && claims.token_type !== 'Bearer') return null;
    if (!Number.isFinite(clock) || !Number.isFinite(claims.exp) || claims.exp <= clock
      || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > clock))
      || (claims.iat !== undefined && (!Number.isFinite(claims.iat) || claims.iat > clock))) return null;
    const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\s+/).filter(Boolean)
      : Array.isArray(claims.scopes) ? claims.scopes : [];
    if (scopes.some(scope => typeof scope !== 'string') || !scopes.includes(requiredScope) || scopes.some(scope => !SCOPES.has(scope))) return null;
    if (claims.ownerAuthorized !== true || claims.revoked === true || claims.consentRevoked === true
      || claims.consentActive !== true || !identifier(claims.consentRef)) return null;
    return {
      active: true, subject: claims.sub, scopes: [...new Set(scopes)],
      ownerAuthorized: true, revoked: false, consentRevoked: false,
      consentRef: claims.consentRef
    };
  };
}
module.exports = { createIntrospectionBearerVerifier };
