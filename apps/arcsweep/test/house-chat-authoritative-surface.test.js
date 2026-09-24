import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('House Commons mounts the native authoritative social chat compartment before v5 enhancement', async () => {
  const source = await readFile(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

  assert.match(source, /house-chat-authoritative-surface\/v4/);
  assert.match(source, /house-chat-channel-rail\.js/);
  assert.match(source, /data-house-chat-authoritative/);
  assert.match(source, /data-devconsole-chat-root/);
  assert.match(source, /data-house-chat-native-form/);
  assert.match(source, /class=\"panel commons-log\"/);
  assert.match(source, /id=\"commons-form\"/);
  assert.match(source, /HOUSE COMMONS · live capture mesh/);
  assert.match(source, /Send to House Commons ∞/);
  assert.match(source, /data-action=\"commons-refresh\"/);
  assert.match(bootstrap, /house-chat-authoritative-surface\.js'[\s\S]*house-commons-chat-v5\.js'[\s\S]*house-chat-runtime-roster-ui\.js'/);
});

test('House Commons channel rail exposes canonical rooms, live capture, and descriptive runtime-agent presence', async () => {
  const rail = await readFile(new URL('../src/house-chat-channel-rail.js', import.meta.url), 'utf8');
  assert.match(rail, /house-room:constellation/);
  assert.match(rail, /house-room:action/);
  assert.match(rail, /house-room:roleplay/);
  assert.match(rail, /house-room:agent-chatter/);
  assert.match(rail, /LIVE CAPTURE/);
  assert.match(rail, /runtimeHouseVoices/);
  assert.match(rail, /directRoomId/);
  assert.match(rail, /MODEL_PRESENCE_EVENT/);
  assert.match(rail, /data-open-house-direct/);
});

test('authoritative House Commons does not globally install RuneShell mutation effects', async () => {
  const source = await readFile(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /runeshell-native-sidecar\.js/);
});

test('legacy core Commons remains the ArcSweep room shell while the sidecar replaces only the chat compartment', async () => {
  const core = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const surface = await readFile(new URL('../src/house-chat-authoritative-surface.js', import.meta.url), 'utf8');
  assert.match(core, /id=\"commons-form\"/);
  assert.match(surface, /closest\('\.commons-layout'\)/);
  assert.match(surface, /target\.replaceWith\(surface\)/);
  assert.doesNotMatch(surface, /page\.replaceChildren\(surface\)/);
});
