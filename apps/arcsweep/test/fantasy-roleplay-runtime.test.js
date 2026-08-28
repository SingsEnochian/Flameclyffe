import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compileFantasyRoleplayEnvelope,
  fantasyRoleplayMetadata,
  normaliseHouseInteractionMode,
} from '../src/fantasy-roleplay-runtime.js';
import { clearKnowledgeBankCache } from '../src/knowledge-bank-loader.js';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

function jsonResponse(value) {
  return { ok: true, status: 200, async json() { return structuredClone(value); } };
}

async function bankFetch(url) {
  const value = String(url);
  if (value.endsWith('/skills/voice-bank-registry.json')) return jsonResponse(await readJson('skills/voice-bank-registry.json'));
  if (value.endsWith('/skills/cell-banks.json')) return jsonResponse(await readJson('skills/cell-banks.json'));
  if (value.endsWith('/skills/cells/shared/hearthweave.cells.json')) return jsonResponse(await readJson('skills/cells/shared/hearthweave.cells.json'));
  if (value.endsWith('/skills/cells/shared/fantasy-roleplay.cells.json')) return jsonResponse(await readJson('skills/cells/shared/fantasy-roleplay.cells.json'));
  throw new Error(`Unexpected bank fetch: ${value}`);
}

test('fantasy roleplay is a shared inherited bank and Ox Alpha is registered', async () => {
  const manifest = await readJson('skills/cell-banks.json');
  const registry = await readJson('skills/voice-bank-registry.json');
  assert.ok(manifest.shared.some((entry) => entry.subject?.id === 'fantasy-roleplay' && entry.banks.includes('./cells/shared/fantasy-roleplay.cells.json')));
  assert.ok(registry.canonicalEstablishedVoices.some((voice) => voice.id === 'oxalpha' && voice.runtimeAliases.includes('oxalpha')));
});

test('chat stays plain while roleplay compiles a bounded shared contract for OA', async () => {
  clearKnowledgeBankCache();
  const chat = await compileFantasyRoleplayEnvelope({ voiceId: 'oxalpha', message: 'Hello.', mode: 'chat', fetchImpl: bankFetch });
  assert.equal(chat.active, false);
  assert.equal(chat.message, 'Hello.');

  clearKnowledgeBankCache();
  const roleplay = await compileFantasyRoleplayEnvelope({
    voiceId: 'oxalpha',
    message: 'The door opens.',
    mode: 'roleplay',
    worldContext: { context_id: 'ctx:1', identity_anchor: { world_id: 'taaveren-vaen' } },
    fetchImpl: bankFetch,
  });
  assert.equal(roleplay.active, true);
  assert.equal(roleplay.voiceId, 'oxalpha');
  assert.equal(roleplay.worldId, 'taaveren-vaen');
  assert.ok(roleplay.skillCellCount > 5);
  assert.ok(roleplay.skillChars <= 12_000);
  assert.match(roleplay.message, /FANTASY ROLEPLAY/);
  assert.match(roleplay.message, /participant-controlled characters|participant/i);
  assert.match(roleplay.message, /The door opens\./);

  const metadata = fantasyRoleplayMetadata(roleplay, { surface: 'house-commons' });
  assert.equal(metadata.interaction_mode, 'roleplay');
  assert.equal(metadata.interaction_skill, 'fantasy-roleplay');
  assert.equal(metadata.visible_message, 'The door opens.');
});

test('interaction modes fail closed to ordinary chat', () => {
  assert.equal(normaliseHouseInteractionMode('roleplay'), 'roleplay');
  assert.equal(normaliseHouseInteractionMode('story'), 'story');
  assert.equal(normaliseHouseInteractionMode('anything-else'), 'chat');
});
