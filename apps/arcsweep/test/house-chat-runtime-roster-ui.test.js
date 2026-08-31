import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { HOUSE_CHAT_VOICES, runtimeHouseVoices } from '../src/house-commons-chat-v5-core.js';

test('runtime roster keeps configured voices visible while preserving live runtime metadata', () => {
  const fallback = [
    { id: 'lioreal', name: 'Lioreal', route: 'lioreal' },
    { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', model: 'GLM-5.3-Flash' },
    { id: 'uial', name: 'Uial', route: 'uial' },
  ];
  const voices = runtimeHouseVoices([
    { voice_id: 'lioreal', display_name: 'Lioreal', state: 'ready', provider: 'openai', model: 'gpt-test', route: 'lioreal' },
    { voice_id: 'uial', display_name: 'Uial', state: 'offline', provider: 'test', model: 'test', route: 'uial' },
  ], fallback);

  assert.deepEqual(voices.map((voice) => voice.id), ['lioreal', 'oxalpha', 'uial']);
  assert.equal(voices.find((voice) => voice.id === 'lioreal')?.provider, 'openai');
  assert.equal(voices.find((voice) => voice.id === 'lioreal')?.state, 'ready');
  assert.equal(voices.find((voice) => voice.id === 'oxalpha')?.name, 'Ox Alpha');
  assert.equal(voices.find((voice) => voice.id === 'oxalpha')?.state, 'offline');
});

test('runtime-only identities remain visible without replacing the configured roster', () => {
  const fallback = [{ id: 'lioreal', name: 'Lioreal' }, { id: 'oxalpha', name: 'Ox Alpha' }];
  const voices = runtimeHouseVoices([{ voice_id: 'temporary-lab', display_name: 'Temporary Lab', state: 'ready' }], fallback);
  assert.deepEqual(voices.map((voice) => voice.id), ['lioreal', 'oxalpha', 'temporary-lab']);
  assert.equal(voices.find((voice) => voice.id === 'temporary-lab')?.runtime_only, true);
});

test('Ox Alpha is one canonical House identity and OA is not invented as a second voice', () => {
  assert.equal(HOUSE_CHAT_VOICES.some((voice) => voice.id === 'oxalpha' && voice.name === 'Ox Alpha'), true);
  assert.equal(HOUSE_CHAT_VOICES.some((voice) => voice.id === 'oa'), false);
});

test('visible House Chat mounts runtime roster UI after v5', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const roster = await readFile(new URL('../src/house-chat-runtime-roster-ui.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /house-commons-chat-v5\.js'[\s\S]*house-chat-runtime-roster-ui\.js'/);
  assert.match(roster, /currentModelPresence/);
  assert.match(roster, /data-house-runtime-roster/);
  assert.match(roster, /house-runtime-roster-legacy/);
});
