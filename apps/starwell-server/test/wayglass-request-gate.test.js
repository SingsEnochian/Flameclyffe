'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createRequestGate } = require('../security/wayglass-request-gate');

function response() {
  const res = new EventEmitter();
  res.headers = {};
  res.statusCode = 200;
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.body = value; res.emit('finish'); return res; };
  return res;
}

test('Wayglass gate bounds request count and reports Retry-After without secrets', () => {
  let now = 1000;
  const gate = createRequestGate({ maxRequests: 2, windowMs: 5000, maxConcurrent: 2, clock: () => now });
  for (let i = 0; i < 2; i++) {
    const res = response();
    let nextCalled = 0;
    gate({ headers: { 'x-forwarded-for': String(i) } }, res, () => { nextCalled++; res.emit('finish'); });
    assert.equal(nextCalled, 1);
    assert.equal(res.statusCode, 200);
  }
  const limited = response();
  let called = false;
  gate({ headers: { 'x-forwarded-for': 'attacker-chosen-ip' } }, limited, () => { called = true; });
  assert.equal(called, false);
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers['cache-control'], 'no-store');
  assert.equal(limited.headers['retry-after'], '5');
  assert.match(limited.body.error, /request limit/);
  assert.ok(!JSON.stringify(limited.body).includes('attacker-chosen-ip'));

  now += 5000;
  const recovered = response();
  gate({}, recovered, () => { called = true; recovered.emit('finish'); });
  assert.equal(called, true);
  assert.equal(recovered.statusCode, 200);
});

test('Wayglass gate caps work in flight and releases slots on close or finish', () => {
  const gate = createRequestGate({ maxRequests: 10, maxConcurrent: 1, clock: () => 1000 });
  const pending = response();
  let entered = 0;
  gate({}, pending, () => { entered++; });
  assert.equal(entered, 1);
  const blocked = response();
  gate({}, blocked, () => { entered++; });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['retry-after'], '1');
  assert.equal(entered, 1);
  pending.emit('close');
  pending.emit('finish'); // a single call must release the slot only once
  const next = response();
  gate({}, next, () => { entered++; next.emit('finish'); });
  assert.equal(entered, 2);
});

test('Gate rejects invalid limits and never constructs dynamic per-IP buckets', () => {
  for (const config of [{}, { maxRequests: 0 }, { maxRequests: 2, windowMs: 0 }, { maxRequests: 2, maxConcurrent: 0 }]) {
    assert.throws(() => createRequestGate(config), /positive bounded settings/);
  }
  const code = require('node:fs').readFileSync(require.resolve('../security/wayglass-request-gate'), 'utf8');
  assert.doesNotMatch(code, /req\.headers\[['"]x-forwarded-for/);
});

test('Sensitive Wayglass entrances apply request gates before verification', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const oauth = fs.readFileSync(path.join(__dirname, '..', 'wayglass', 'oauth-peer.js'), 'utf8');
  const bluebird = fs.readFileSync(path.join(__dirname, '..', 'wayglass', 'bluebird-provider.js'), 'utf8');
  assert.match(oauth, /app\.get\('\/oauth\/authorize', authorizeViewGate,/);
  assert.match(oauth, /app\.post\('\/oauth\/authorize', pairingGate,/);
  assert.match(oauth, /app\.post\('\/oauth\/token', tokenGate,/);
  assert.match(bluebird, /router\.post\('\/authorize', credentialGate,/);
  assert.match(bluebird, /router\.post\('\/respond', replyGate,/);
});
