'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createIntrospectionBearerVerifier } = require('../lib/wayglass-mcp-introspection-verifier.cjs');
const audience = 'https://wayglass.example/mcp';
const base = { active: true, iss: 'https://issuer.example', sub: 'owner-1',
  aud: audience, exp: 2000, nbf: 900, scope: 'wayglass:constellation',
  ownerAuthorized: true, consentActive: true, consentRef: 'consent-1' };
const options = { issuer: base.iss, audience, ownerSubject: base.sub, now: () => 1000 };
const request = { resource: audience, requiredScope: 'wayglass:constellation' };
test('trusted introspection preserves identity and consent attribution without token exposure', async () => {
  const verify = createIntrospectionBearerVerifier({ ...options, introspect: async token => {
    assert.equal(token, 'synthetic-token'); return { ...base };
  } });
  const principal = await verify('synthetic-token', request);
  assert.equal(principal.subject, 'owner-1');
  assert.equal(principal.consentRef, 'consent-1');
  assert.deepEqual(principal.scopes, ['wayglass:constellation']);
  assert.equal(JSON.stringify(principal).includes('synthetic-token'), false);
});
test('invalid issuer, audience, owner, consent, revocation, expiry and scope fail closed', async () => {
  const cases = [
    { iss: 'https://imposter.example' }, { aud: 'https://wrong.example/mcp' },
    { sub: 'someone-else' }, { ownerAuthorized: false },
    { consentActive: false }, { consentRevoked: true }, { revoked: true },
    { consentRef: '' }, { exp: 1000 }, { nbf: 1001 },
    { scope: 'wayglass:bluebird' }, { scope: 'wayglass:constellation admin' },
    { active: false }
  ];
  for (const change of cases) {
    const verify = createIntrospectionBearerVerifier({ ...options, introspect: async () => ({ ...base, ...change }) });
    assert.equal(await verify('synthetic-token', request), null, JSON.stringify(change));
  }
});
test('introspection errors and resource substitution fail closed', async () => {
  const verify = createIntrospectionBearerVerifier({ ...options, introspect: async () => { throw Error('private secret'); } });
  assert.equal(await verify('synthetic-token', request), null);
  const valid = createIntrospectionBearerVerifier({ ...options, introspect: async () => base });
  assert.equal(await valid('synthetic-token', { ...request, resource: 'https://other.example/mcp' }), null);
});
test('bluebird scope is distinct and only admitted when explicitly requested', async () => {
  const verify = createIntrospectionBearerVerifier({ ...options, introspect: async () => ({ ...base, scope: 'wayglass:bluebird' }) });
  assert.equal(await verify('synthetic-token', request), null);
  assert.deepEqual((await verify('synthetic-token', { ...request, requiredScope: 'wayglass:bluebird' })).scopes, ['wayglass:bluebird']);
});
