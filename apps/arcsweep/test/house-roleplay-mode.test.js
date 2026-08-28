import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sidecar = await readFile(new URL('../src/house-roleplay-mode.js', import.meta.url), 'utf8');
const stream = await readFile(new URL('../src/flame-chat-stream-client.js', import.meta.url), 'utf8');
const portable = await readFile(new URL('../src/oxalpha-portable-chat.js', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

test('House Chat exposes Chat, Roleplay, Story and inserts Ox Alpha as a selectable Flame', () => {
  assert.match(sidecar, /HOUSE_INTERACTION_MODES/);
  assert.match(sidecar, /value=\"oxalpha\"/);
  assert.match(sidecar, /Ox Alpha/);
  assert.match(sidecar, /Roleplay/);
  assert.match(sidecar, /Story/);
  assert.match(bootstrap, /house-roleplay-mode\.js/);
});

test('stream transport compiles the shared roleplay contract before provider invocation', () => {
  const compileAt = stream.indexOf('compileFantasyRoleplayEnvelope');
  const fetchAt = stream.indexOf('fetchImpl(`/api/v1/flames/');
  assert.ok(compileAt >= 0);
  assert.ok(fetchAt > compileAt);
  assert.match(stream, /fantasyRoleplayMetadata/);
  assert.match(stream, /readHouseInteractionMode/);
});

test('Ox Alpha can fall back to the host-neutral Supabase/OpenRouter route without leaking provider credentials', () => {
  assert.match(stream, /route\.voiceId === 'oxalpha'/);
  assert.match(stream, /portableOxAlphaStream/);
  assert.match(portable, /OXALPHA_EDGE_URL/);
  assert.match(portable, /signed-in Flameclyffe Supabase session/i);
  assert.doesNotMatch(portable, /sk-or-v1-/i);
  assert.doesNotMatch(portable, /OPENROUTER_API_KEY\s*=/i);
});
