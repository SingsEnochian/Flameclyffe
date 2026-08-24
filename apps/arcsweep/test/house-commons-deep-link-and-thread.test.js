import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommonsDeepLink, deepLinkSelector } from '../src/house-commons-deep-link-router.js';
import { readActiveCommonsThread, writeActiveCommonsThread, COMMONS_ACTIVE_THREAD_KEY } from '../src/house-commons-thread-restoration.js';

function memoryStorage() { const map = new Map(); return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: (key) => map.delete(key) }; }

test('Commons deep links resolve exact stable Arcsweep selectors', () => {
  assert.equal(deepLinkSelector('world', 'terra-prime'), '[data-world-id="terra-prime"]');
  assert.equal(deepLinkSelector('script', 'scene-7'), '[data-script-id="scene-7"]');
  assert.equal(deepLinkSelector('record', 'rec-9'), '[data-record-id="rec-9"]');
  assert.equal(deepLinkSelector('feedback', 'cycle-1'), '[data-cycle-id="cycle-1"]');
  assert.deepEqual(createCommonsDeepLink('canon', 'canon-2'), { kind: 'canon', id: 'canon-2', label: null, room: 'records', selector: '[data-record-id="canon-2"]' });
});

test('Commons active thread survives storage round trips and clears cleanly', () => {
  const storage = memoryStorage();
  assert.equal(writeActiveCommonsThread('thread-42', storage), 'thread-42');
  assert.equal(storage.getItem(COMMONS_ACTIVE_THREAD_KEY), 'thread-42');
  assert.equal(readActiveCommonsThread(storage), 'thread-42');
  writeActiveCommonsThread('', storage);
  assert.equal(readActiveCommonsThread(storage), '');
});
