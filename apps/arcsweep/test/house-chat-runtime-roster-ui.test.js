import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { runtimeHouseVoices } from '../src/house-commons-chat-v5-core.js';

test('runtime roster prefers live non-offline voices and preserves runtime metadata', () => {
  const voices = runtimeHouseVoices([
    { voice_id: 'lioreal', display_name: 'Lioreal', state: 'ready', provider: 'openai', model: 'gpt-test', route: 'lioreal' },
    { voice_id: 'oa', display_name: 'OA', state: 'ready', provider: 'openai', model: 'oa-test', route: 'oa' },
    { voice_id: 'uial', display_name: 'Uial', state: 'offline', provider: 'test', model: 'test', route: 'uial' },
  ], [{ id: 'lioreal', name: 'Lioreal', route: 'lioreal' }, { id: 'uial', name: 'Uial', route: 'uial' }]);

  assert.deepEqual(voices.map((voice) => voice.id), ['lioreal', 'oa']);
  assert.equal(voices.find((voice) => voice.id === 'oa')?.provider, 'openai');
  assert.equal(voices.find((voice) => voice.id === 'oa')?.state, 'ready');
});

test('runtime roster falls back only when no live runtime voices exist', () => {
  const fallback = [{ id: 'lioreal', name: 'Lioreal' }];
  assert.deepEqual(runtimeHouseVoices([], fallback), fallback);
  assert.deepEqual(runtimeHouseVoices([{ voice_id: 'lioreal', state: 'offline' }], fallback), fallback);
});

test('visible House Chat mounts runtime roster UI after v5', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const roster = await readFile(new URL('../src/house-chat-runtime-roster-ui.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /house-commons-chat-v5\.js'[\s\S]*house-chat-runtime-roster-ui\.js'/);
  assert.match(roster, /currentModelPresence/);
  assert.match(roster, /data-house-runtime-roster/);
  assert.match(roster, /house-runtime-roster-legacy/);
});
