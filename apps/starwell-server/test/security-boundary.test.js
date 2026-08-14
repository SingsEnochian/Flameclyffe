'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isAllowedLocalOrigin,
  localCorsOptions,
  mergeHearthgateConfigSecrets,
  redactHearthgateConfig,
  sanitiseHearthgateConfig,
} = require('../security/local-boundary');

function config(overrides = {}) {
  const base = {
    name: 'Hearthweave',
    steward: 'Rowan',
    theme: 'grove',
    keys: {
      runtime: 'house-runtime-secret',
      anthropic: 'ant-secret',
      openai: 'open-secret',
      exa: '',
      deepseek_blue: '',
      deepseek_veth: '',
      ollama: 'http://127.0.0.1:11434',
      custom: [{ name: 'HYDRADB_API_KEY', value: 'hydra-secret' }],
    },
  };
  return {
    ...base,
    ...overrides,
    keys: { ...base.keys, ...(overrides.keys || {}) },
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

test('sanitises dedicated runtime token and freezes out runtime injection names', () => {
  const safe = sanitiseHearthgateConfig(config());
  assert.equal(safe.schema, 'hearthgate.config/v1');
  assert.equal(safe.keys.runtime, 'house-runtime-secret');
  assert.equal(safe.keys.custom[0].name, 'HYDRADB_API_KEY');

  for (const reserved of ['NODE_OPTIONS', 'PATH', 'ARCSWEEP_RUNTIME_TOKEN']) {
    assert.throws(
      () => sanitiseHearthgateConfig(config({
        keys: { custom: [{ name: reserved, value: 'payload-secret' }] },
      })),
      /not an allowed provider variable name|reserved/,
      reserved,
    );
  }
});

test('redacts House runtime token and provider secrets before configuration crosses IPC', () => {
  const redacted = redactHearthgateConfig(config());
  assert.equal(redacted.keys.runtime, true);
  assert.equal(redacted.keys.anthropic, true);
  assert.equal(redacted.keys.openai, true);
  assert.equal(redacted.keys.custom[0].name, 'HYDRADB_API_KEY');
  const serialised = JSON.stringify(redacted);
  assert.equal(serialised.includes('house-runtime-secret'), false);
  assert.equal(serialised.includes('ant-secret'), false);
  assert.equal(serialised.includes('hydra-secret'), false);
});

test('blank secret fields preserve encrypted existing values during wizard reconfiguration', () => {
  const existing = config();
  const edited = config({
    name: 'Hearthweave II',
    theme: 'stonewood',
    keys: {
      runtime: '',
      anthropic: '',
      openai: 'replacement-openai',
      exa: '',
      deepseek_blue: '',
      deepseek_veth: '',
      ollama: '',
      custom: [],
    },
  });
  const merged = mergeHearthgateConfigSecrets(edited, existing);
  assert.equal(merged.name, 'Hearthweave II');
  assert.equal(merged.theme, 'stonewood');
  assert.equal(merged.keys.runtime, 'house-runtime-secret');
  assert.equal(merged.keys.anthropic, 'ant-secret');
  assert.equal(merged.keys.openai, 'replacement-openai');
  assert.equal(merged.keys.ollama, 'http://127.0.0.1:11434');
  assert.equal(merged.keys.custom[0].value, 'hydra-secret');
});

test('first configuration cannot invent a missing runtime token during merge', () => {
  const first = mergeHearthgateConfigSecrets(config({ keys: { runtime: '', custom: [] } }), null);
  assert.equal(first.keys.runtime, '');
});
