'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  runtimeAuthorizationUrls,
  shouldAttachRuntimeAuthorization,
  attachRuntimeAuthorization,
} = require('../electron/runtime-request-auth');

test('Electron authorization filter contains only Hearthgate loopback runtime routes', () => {
  const urls = runtimeAuthorizationUrls(3841);
  assert.ok(urls.includes('http://localhost:3841/api/v1/flames/*'));
  assert.ok(urls.includes('http://127.0.0.1:3841/api/v1/bifrost/ignition/*'));
  assert.ok(urls.includes('http://localhost:3841/api/chat*'));
  assert.equal(urls.some((url) => /api\.openai|anthropic|deepseek/i.test(url)), false);
});

test('runtime authorization attaches to exact local model paths only', () => {
  for (const url of [
    'http://localhost:3841/api/chat',
    'http://127.0.0.1:3841/api/v1/flames/uial/chat',
    'http://localhost:3841/api/v1/bifrost/ignition/start-ollama',
    'http://localhost:3841/api/v1/bifrost/ignition/profile/uial%3Afablevibes-v1/materialize-alias',
  ]) assert.equal(shouldAttachRuntimeAuthorization(url, 3841), true, url);

  for (const url of [
    'http://localhost:3841/api/model-status',
    'http://localhost:3841/api/v1/bifrost/model-profiles',
    'http://localhost:3841/reader',
    'http://127.0.0.1:3842/api/v1/flames/uial/chat',
    'http://localhost:9999/api/v1/flames/uial/chat',
    'https://api.deepseek.com/chat/completions',
    'https://api.openai.com/v1/chat/completions',
    'https://example.com/api/chat',
  ]) assert.equal(shouldAttachRuntimeAuthorization(url, 3841), false, url);
});

test('authorization injection adds Bearer token without destroying existing headers', () => {
  const headers = attachRuntimeAuthorization({ Accept: 'application/json', Origin: 'http://localhost:3841' }, 'house-secret');
  assert.equal(headers.Authorization, 'Bearer house-secret');
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers.Origin, 'http://localhost:3841');
});

test('empty runtime token never creates an Authorization header', () => {
  const headers = attachRuntimeAuthorization({ Accept: 'application/json' }, '');
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.Accept, 'application/json');
});
