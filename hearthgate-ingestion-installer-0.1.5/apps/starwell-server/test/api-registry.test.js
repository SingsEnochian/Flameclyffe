'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { apiRegistry } = require('../lib/api-registry');

test('API registry reports configured routes without returning secrets', () => {
  process.env.BLUEBIRD_DEEPSEEK_API_KEY = 'do-not-return-this';
  process.env.HEARTHGATE_CUSTOM_API_NAMES = '["MY_PRIVATE_API_KEY"]';
  process.env.MY_PRIVATE_API_KEY = 'also-secret';
  try {
    const registry = apiRegistry();
    assert.equal(registry.providers.find((provider) => provider.id === 'bluebird').configured, true);
    assert.equal(registry.providers.find((provider) => provider.id === 'custom:my_private_api_key').configured, true);
    assert.doesNotMatch(JSON.stringify(registry), /do-not-return-this|also-secret/);
  } finally {
    delete process.env.BLUEBIRD_DEEPSEEK_API_KEY;
    delete process.env.HEARTHGATE_CUSTOM_API_NAMES;
    delete process.env.MY_PRIVATE_API_KEY;
  }
});

