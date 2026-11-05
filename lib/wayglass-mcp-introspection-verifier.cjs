'use strict';

// Deployment adapter: introspection is performed by an independently trusted
// authorization-server client. This module never decodes or trusts token claims
// locally, and never treats scope possession as an owner grant.
const SCOPES = new Set(['wayglass:constellation', 'wayglass:bluebird']);
function createIntrospectionBearerVerifier({ introspect, issuer, audience, ownerSubject, now = () => Date.now() / 1000 } = {}) {
  if (typeof introspect !== 'function') throw new TypeError('Trusted introspection callback required');
  if (![issuer, audience, ownerSubject].every(v => typeof v === 'string' && v.length > 0)) {
    throw new TypeError('Issuer, audience and owner subject are required');
  }
  return async function verifyBearer(token, { resource, requiredScope } = {}) {
    if (typeof token !== 'string' || !token || resource !== audience || !SCOPES.has(requiredScope)) return null;
    let claims;
    try { claims = await introspect(token); } catch { return null; }
    if (!claims || claims.active !== true || claims.iss !== issuer || claims.sub !== ownerSubject) return null;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(audience)) return null;
    const clock = now();
    if (!Number.isFinite(clock) || !Number.isFinite(claims.exp) || claims.exp <= clock
      || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > clock))) return null;
    const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\\s+/).filter(Boolean)
      : Array.isArray(claims.scopes) ? claims.scopes : [];
    if (!scopes.includes(requiredScope) || scopes.some(scope => !SCOPES.has(scope))) return null;
    if (claims.ownerAuthorized !== true || claims.revoked === true || claims.consentRevoked === true
      || claims.consentActive !== true || typeof claims.consentRef !== 'string' || !claims.consentRef.trim()) return null;
    return {
      active: true, subject: claims.sub, scopes: [...new Set(scopes)],
      ownerAuthorized: true, revoked: false, consentRevoked: false,
      consentRef: claims.consentRef
    };
  };
}
module.exports = { createIntrospectionBearerVerifier };
