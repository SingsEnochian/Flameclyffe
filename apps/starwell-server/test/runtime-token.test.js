'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  secretEqual,
  bearerFromHeader,
  acceptedRuntimeTokens,
  validateRuntimeToken,
} = require('../security/runtime-token');

test('Bearer parser accepts only explicit Bearer scheme', () => {
  assert.equal(bearerFromHeader('Bearer house-secret'), 'house-secret');
  assert.equal(bearerFromHeader('Basic house-secret'), '');
  assert.equal(bearerFromHeader(''), '');
});

test('runtime accepts Arcsweep session token or Hearthgate gateway token', () => {
  const env = {
    ARCSWEEP_RUNTIME_TOKEN: 'arcsweep-secret',
    HEARTHGATE_GATEWAY_TOKEN: 'gateway-secret',
  };
  assert.deepEqual(acceptedRuntimeTokens(env), ['arcsweep-secret', 'gateway-secret']);
  assert.equal(validateRuntimeToken('arcsweep-secret', env).ok, true);
  assert.equal(validateRuntimeToken('gateway-secret', env).ok, true);
  assert.equal(validateRuntimeToken('wrong', env).ok, false);
});

test('missing runtime token configuration is distinguishable from invalid credentials', () => {
  const missing = validateRuntimeToken('anything', {});
  assert.equal(missing.ok, false);
  assert.equal(missing.configured, false);
  assert.equal(missing.reason, 'runtime-token-not-configured');

  const invalid = validateRuntimeToken('wrong', { ARCSWEEP_RUNTIME_TOKEN: 'right' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.configured, true);
  assert.equal(invalid.reason, 'runtime-token-invalid');
});

test('secret comparison fails closed on length mismatch and missing values', () => {
  assert.equal(secretEqual('abc', 'abc'), true);
  assert.equal(secretEqual('abc', 'abcd'), false);
  assert.equal(secretEqual('', 'abc'), false);
  assert.equal(secretEqual('abc', ''), false);
});
