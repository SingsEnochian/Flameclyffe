import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/model-reply-proof.js', import.meta.url), 'utf8');
const sidecars = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

test('model reply proof is mounted with the runtime sidecars', () => {
  assert.match(sidecars, /'\.\/model-reply-proof\.js'/);
  assert.ok(sidecars.indexOf('./model-reply-proof.js') > sidecars.indexOf('./model-presence-live-ui.js'));
});

test('LIVE requires an attributable model reply rather than status metadata alone', () => {
  assert.match(source, /reply\?\.status === 'replied'/);
  assert.match(source, /runtimeVerified === true/);
  assert.match(source, /Boolean\(reply\?\.provider\)/);
  assert.match(source, /Boolean\(reply\?\.model\)/);
  assert.match(source, /Boolean\(reply\?\.route\)/);
  assert.match(source, /Boolean\(String\(reply\?\.message/);
});

test('reply proof writes a receipt into House Commons', () => {
  assert.match(source, /appendHouseCommons/);
  assert.match(source, /thread_id: 'model-reply-proof-001'/);
  assert.match(source, /LIVE PROVEN/);
  assert.match(source, /NOT PROVEN/);
});

test('available choir proof keeps funding deferral distinct from runtime failure', () => {
  assert.match(source, /data-proof-available/);
  assert.match(source, /data-proof-choir/);
  assert.match(source, /DEFERRED_FUNDING_VOICE_IDS/);
  assert.match(source, /'deferred-funding'/);
  assert.match(source, /Funding deferrals are not failures/);
  assert.match(source, /MODEL REPLY PROOF 001/);
});
