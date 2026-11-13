import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTailnetServeStatus } from '../../../scripts/wayglass-local.mjs';

test('Tailscale Serve inspector detects no existing publication', () => {
  assert.equal(assessTailnetServeStatus(''), 'empty');
  assert.equal(assessTailnetServeStatus(JSON.stringify({ Web: {}, TCP: {} })), 'empty');
});

test('Tailscale Serve inspector recognises the reviewed same-origin Wayglass host', () => {
  const json = JSON.stringify({ Web: {
    'rowan.tailnet.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:3000' } } },
  } });
  assert.equal(assessTailnetServeStatus(json), 'wayglass');
});

test('Tailscale Serve inspector refuses to overwrite other services and Funnel', () => {
  assert.equal(assessTailnetServeStatus(JSON.stringify({ Web: {
    'rowan.tailnet.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:8080' } } },
  } })), 'occupied');
  assert.equal(assessTailnetServeStatus(JSON.stringify({ Web: {
    'rowan.tailnet.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:3000' } } },
  }, AllowFunnel: { 'rowan.tailnet.ts.net:443': true } })), 'occupied');
  assert.equal(assessTailnetServeStatus('{not-json}'), 'unreadable');
});
