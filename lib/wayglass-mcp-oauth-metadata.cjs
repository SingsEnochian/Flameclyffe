'use strict';

// Pure, offline validation of an OAuth authorization-server discovery document.
// This is NOT a token verifier or an authorization server. Never infer that
// discovery alone establishes owner identity or a live PKCE exchange.
function validateWayglassAuthorizationMetadata(document, expectedIssuer) {
  const expected = new URL(expectedIssuer);
  if (expected.protocol !== 'https:' || expected.username || expected.password ||
      expected.search || expected.hash) throw new TypeError('Invalid expected issuer');
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new TypeError('Authorization metadata required');
  }
  if (document.issuer !== expected.href) throw new TypeError('OAuth issuer mismatch');
  function endpoint(name) {
    const raw = document[name];
    if (typeof raw !== 'string') throw new TypeError(name + ' missing');
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.hash || url.search || url.origin !== expected.origin) {
      throw new TypeError(name + ' must be same-origin HTTPS without embedded credentials');
    }
    return url.href;
  }
  const authorizationEndpoint = endpoint('authorization_endpoint');
  const tokenEndpoint = endpoint('token_endpoint');
  if (!Array.isArray(document.response_types_supported) ||
      !document.response_types_supported.includes('code')) {
    throw new TypeError('Authorization code grant not advertised');
  }
  if (!Array.isArray(document.code_challenge_methods_supported) ||
      !document.code_challenge_methods_supported.includes('S256')) {
    throw new TypeError('PKCE S256 required');
  }
  if (!Array.isArray(document.grant_types_supported) ||
      !document.grant_types_supported.includes('authorization_code')) {
    throw new TypeError('Authorization code grant required');
  }
  return Object.freeze({ issuer: expected.href, authorizationEndpoint, tokenEndpoint, pkce: 'S256' });
}
module.exports = { validateWayglassAuthorizationMetadata };
