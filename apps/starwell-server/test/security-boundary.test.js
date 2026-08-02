'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isAllowedLocalOrigin,
  localCorsOptions,
  redactHearthgateConfig,
  sanitiseHearthgateConfig,
} = require('../security/local-boundary');

function config(overrides = {}) {
  return {
    name: 'Hearthweave',
    steward: 'Rowan',
    theme: 'grove',
    keys: {
      anthropic: 'ant-secret',
      openai: 'open-secret',
      exa: '',
      deepseek_blue: '',
      deepseek_veth: '',
      ollama: 'http://127.0.0.1:11434',
      custom: [{ name: 'HYDRADB_API_KEY', value: 'hydra-secret' }],
    },
    ...overrides,
  };
}

test('allows Hearthgate and development loopback origins only', () => {
  assert.equal(isAllowedLocalOrigin('http://localhost:3841', {}), true);
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1:5173', {}), true);
  assert.equal(isAllowedLocalOrigin('https://example.com', {}), false);
  assert.equal(isAllowedLocalOrigin(undefined, {}), true);
  assert.equal(
    isAllowedLocalOrigin('https://trusted.local', { HEARTHGATE_ALLOWED_ORIGINS: 'https://trusted.local' }),
    true,
  );
});

test('CORS callback rejects origins outside the local boundary', async () => {
  const options = localCorsOptions({});
  await new Promise((resolve, reject) => {
    options.origin('https://example.com', (error, allowed) => {
      try {
        assert.equal(allowed, undefined);
        assert.equal(error.code, 'HEARTHGATE_ORIGIN_DENIED');
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test('sanitises provider configuration and freezes out runtime injection names', () => {
  const safe = sanitiseHearthgateConfig(config());
  assert.equal(safe.schema, 'hearthgate.config/v1');
  assert.equal(safe.keys.custom[0].name, 'HYDRADB_API_KEY');

  assert.throws(
    () => sanitiseHearthgateConfig(config({
      keys: { ...config().keys, custom: [{ name: 'NODE_OPTIONS', value: '--require ./payload.js' }] },
    })),
    /not an allowed provider variable name|reserved/,
  );

  assert.throws(
    () => sanitiseHearthgateConfig(config({
      keys: { ...config().keys, custom: [{ name: 'PATH', value: 'C:\\trap' }] },
    })),
    /not an allowed provider variable name|reserved/,
  );
});

test('redacts secrets before configuration crosses IPC', () => {
  const redacted = redactHearthgateConfig(config());
  assert.equal(redacted.keys.anthropic, true);
  assert.equal(redacted.keys.openai, true);
  assert.equal(redacted.keys.custom[0].name, 'HYDRADB_API_KEY');
  assert.equal(JSON.stringify(redacted).includes('ant-secret'), false);
  assert.equal(JSON.stringify(redacted).includes('hydra-secret'), false);
});
