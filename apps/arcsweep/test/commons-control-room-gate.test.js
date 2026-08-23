import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('hosted House controls use sealed identity instead of a password field', async () => {
  const [ui, sidecars] = await Promise.all([
    source('hosted-house-session-ui.js'),
    source('sidecar-bootstrap.js'),
  ]);
  assert.match(sidecars, /hosted-house-session-ui\.js/);
  assert.match(ui, /Steward signed in · House sealed/);
  assert.match(ui, /Supabase magic-link Steward identity/);
  assert.match(ui, /Seal House session/);
  assert.match(ui, /restoreHouseRuntimeSession/);
  assert.doesNotMatch(ui, /type=["']password["']/);
  assert.doesNotMatch(ui, /name=["']runtimeToken["']/);
});

test('Command Room exposes pinning and New thread clears the active thread filter', async () => {
  const commandRoom = await source('house-commons-command-room.js');
  assert.match(commandRoom, /data-pin-command-thread/);
  assert.match(commandRoom, /COMMONS_PINS_KEY/);
  assert.match(commandRoom, /set\.has\(id\) \? set\.delete\(id\) : set\.add\(id\)/);
  assert.match(commandRoom, /function beginNewThread\(\)/);
  assert.match(commandRoom, /selector\.value = ''/);
  assert.match(commandRoom, /textarea\[name="message"\]/);
});

test('hosted session UI observes only Settings insertion rather than its own mutations', async () => {
  const ui = await source('hosted-house-session-ui.js');
  assert.match(ui, /mutationIntroducedSettings/);
  assert.match(ui, /node\.matches\?\.\('\.house-runtime'\)/);
  assert.doesNotMatch(ui, /new MutationObserver\(\(\) => enhanceHostedHouseSessionUi/);
});
