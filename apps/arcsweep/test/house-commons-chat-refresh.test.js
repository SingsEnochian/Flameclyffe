import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat = fs.readFileSync(new URL('../src/house-commons-chat.js', import.meta.url), 'utf8');

test('Commons chat polling may read repeatedly but unchanged snapshots do not rebuild the log', () => {
  assert.match(chat, /commonsLogSignature/);
  assert.match(chat, /signature === lastLogSignature/);
  assert.match(chat, /if \(!force && signature === lastLogSignature\) return/);
});

test('Commons chat coalesces overlapping refreshes', () => {
  assert.match(chat, /refreshInFlight/);
  assert.match(chat, /if \(refreshInFlight\) return refreshInFlight/);
});

test('Commons chat translates status-zero style failures into transport language', () => {
  assert.match(chat, /describeCommonsTransportError/);
  assert.match(chat, /no HTTP response received/);
  assert.match(chat, /House Commons\|House Runtime/);
});
