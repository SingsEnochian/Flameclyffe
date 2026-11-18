'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateWayglassAuthorizationMetadata: validate } = require('../lib/wayglass-mcp-oauth-metadata.cjs');
const issuer = 'https://auth.wayglass.example/';
const good = () => ({
  issuer,
  authorization_endpoint: issuer + 'authorize',
  token_endpoint: issuer + 'token',
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
  code_challenge_methods_supported: ['S256'],
});
test('accepts only explicit OAuth authorization-code PKCE S256 discovery', () => {
  assert.deepEqual(validate(good(), issuer), {
    issuer, authorizationEndpoint: issuer + 'authorize',
    tokenEndpoint: issuer + 'token', pkce: 'S256',
  });
});
test('rejects issuer substitution, downgrade, cross-origin and embedded credentials', () => {
  const cases = [
    { issuer: 'https://evil.example/' },
    { authorization_endpoint: 'http://auth.wayglass.example/authorize' },
    { token_endpoint: 'https://evil.example/token' },
    { token_endpoint: 'https://user:pass@auth.wayglass.example/token' },
    { token_endpoint: issuer + 'token?secret=x' },
    { authorization_endpoint: issuer + 'authorize#fragment' },
  ];
  for (const patch of cases) assert.throws(() => validate({ ...good(), ...patch }, issuer));
  assert.throws(() => validate(good(), 'http://auth.wayglass.example/'));
});
test('rejects missing authorization-code and S256 support', () => {
  for (const patch of [
    { response_types_supported: ['token'] },
    { grant_types_supported: ['client_credentials'] },
    { code_challenge_methods_supported: ['plain'] },
    { code_challenge_methods_supported: undefined },
  ]) assert.throws(() => validate({ ...good(), ...patch }, issuer));
});
