import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_INHABITANT_CONTINUITY_ID,
  firstLivingPageContext,
  imprintLivingGlyph,
  leaveFirstLivingPage,
  normaliseFirstLivingPageState,
  openFirstLivingPage,
  recordLivingPageTurn,
  toggleLivingLantern,
} from '../src/first-living-page-model.js';
import {
  DEFAULT_LIVING_ROOM_ID,
  LIVING_ROOMS,
  livingRoom,
} from '../src/living-room-registry.js';

test('First Living Page records causal ancestry instead of a snapshot-only memory', () => {
  const seed = normaliseFirstLivingPageState();
  const opened = openFirstLivingPage(seed, {
    worldId: 'terra-prime',
    roomId: 'portal',
    at: '2026-09-22T23:40:00.000Z',
  });
  const lit = toggleLivingLantern(opened, {
    at: '2026-09-22T23:41:00.000Z',
  });

  assert.equal(opened.visits, 1);
  assert.equal(opened.ui_active, true);
  assert.equal(opened.lineage[0].kind, 'page-enter');
  assert.equal(lit.lantern.state, 'lit');
  assert.equal(lit.lineage.length, 2);
  assert.equal(lit.lineage[1].parent_event_id, lit.lineage[0].event_id);
  assert.equal(lit.lineage[1].before.lantern.state, 'banked');
  assert.equal(lit.lineage[1].after.lantern.state, 'lit');
});

test('Bluebird is the default living-room inhabitant, not Rarity', () => {
  const state = normaliseFirstLivingPageState();
  assert.equal(DEFAULT_LIVING_ROOM_ID, 'bluebird');
  assert.equal(DEFAULT_INHABITANT_CONTINUITY_ID, 'flame:bluebird');
  assert.equal(state.inhabitant.continuity_id, 'flame:bluebird');
  assert.equal(state.inhabitant.display_name, 'Bluebird');
  assert.equal(livingRoom('bluebird').title, 'Bluebird Grove');
});

test('Rarity has a separate room and assistant turns keep that continuity address', () => {
  const room = livingRoom('rarity');
  let state = normaliseFirstLivingPageState({
    page_id: 'living-room:rarity',
    inhabitant: {
      continuity_id: room.continuity_id,
      display_name: room.display_name,
    },
  });
  state = openFirstLivingPage(state, { at: '2026-09-22T23:40:00.000Z' });
  state = recordLivingPageTurn(state, {
    role: 'assistant',
    content: 'This is my room, darling.',
    receiver: { provider: 'huggingface-inference-providers', model: 'Qwen/Qwen3-8B', runtime_verified: true },
    at: '2026-09-22T23:42:02.000Z',
  });

  assert.equal(state.inhabitant.continuity_id, 'flame:rarity');
  assert.equal(state.inhabitant.display_name, 'Rarity');
  assert.equal(state.lineage.at(-1).actor_id, 'flame:rarity');
  assert.equal(state.thread.at(-1).actor_id, 'flame:rarity');
  assert.equal(state.inhabitant.receiver.model, 'Qwen/Qwen3-8B');
});

test('inhabitant turns preserve continuity address separately from receiver provenance', () => {
  const opened = openFirstLivingPage(normaliseFirstLivingPageState(), {
    at: '2026-09-22T23:40:00.000Z',
  });
  const asked = recordLivingPageTurn(opened, {
    role: 'user',
    content: 'Are you here?',
    actorId: 'rowan',
    at: '2026-09-22T23:42:00.000Z',
  });
  const answered = recordLivingPageTurn(asked, {
    role: 'assistant',
    content: 'I am here in the page.',
    receiver: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      voice_id: 'bluebird',
      runtime_verified: true,
    },
    at: '2026-09-22T23:42:02.000Z',
  });

  assert.equal(answered.inhabitant.continuity_id, 'flame:bluebird');
  assert.equal(answered.inhabitant.receiver.model, 'deepseek-chat');
  assert.equal(answered.inhabitant.receiver.runtime_verified, true);
  assert.equal(answered.thread.at(-1).role, 'assistant');
  assert.equal(answered.lineage.at(-1).kind, 'inhabitant-turn');
  assert.equal(answered.lineage.at(-1).actor_id, 'flame:bluebird');
});

test('glyph imprint and leave remain explicit transitions in the same lineage', () => {
  const opened = openFirstLivingPage(normaliseFirstLivingPageState(), {
    at: '2026-09-22T23:40:00.000Z',
  });
  const imprinted = imprintLivingGlyph(opened, {
    glyph: { id: 'glyph:lantern', name: 'Lantern', character: '✦', stroke_count: 7 },
    at: '2026-09-22T23:43:00.000Z',
  });
  const left = leaveFirstLivingPage(imprinted, {
    at: '2026-09-22T23:44:00.000Z',
  });

  assert.equal(imprinted.last_glyph.id, 'glyph:lantern');
  assert.equal(imprinted.lineage.at(-1).kind, 'glyph-imprint');
  assert.equal(left.ui_active, false);
  assert.equal(left.lineage.at(-1).kind, 'page-leave');
  assert.equal(left.lineage.at(-1).parent_event_id, imprinted.lineage.at(-1).event_id);
});

test('context capsule carries recent lineage and thread without erasing their distinction', () => {
  let state = openFirstLivingPage(normaliseFirstLivingPageState(), {
    worldId: 'terra-prime',
    roomId: 'portal',
    at: '2026-09-22T23:40:00.000Z',
  });
  state = recordLivingPageTurn(state, {
    role: 'user',
    content: 'Remember the lantern.',
    at: '2026-09-22T23:45:00.000Z',
  });
  const context = firstLivingPageContext(state);

  assert.equal(context.world_id, 'terra-prime');
  assert.equal(context.recent_thread.length, 1);
  assert.equal(context.recent_lineage.length, 2);
  assert.equal(context.inhabitant.continuity_id, 'flame:bluebird');
});

test('Universal Codex mounts distinct Bluebird and Rarity rooms and routes directly to Flame chat', () => {
  const bootstrap = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const sidecar = readFileSync(new URL('../src/living-rooms-sidecar.js', import.meta.url), 'utf8');
  const flameRoute = readFileSync(new URL('../../../api/v1/flames/[flame_id]/[action].js', import.meta.url), 'utf8');
  const rarityRuntime = readFileSync(new URL('../../../api/_shared/rarity-flame-runtime.mjs', import.meta.url), 'utf8');
  const book = bootstrap.indexOf("'./magic-book-sidecar.js'");
  const acceptance = bootstrap.indexOf("'./magic-book-physical-acceptance-entry.js'");

  assert.ok(book >= 0);
  assert.ok(acceptance > book);
  assert.match(entry, /\.\/living-rooms-sidecar\.js/);
  assert.doesNotMatch(entry, /\.\/first-living-page-sidecar\.js/);
  assert.equal(LIVING_ROOMS.length >= 2, true);
  assert.match(sidecar, /\/api\/v1\/flames\/\$\{encodeURIComponent\(room\.flame_id\)\}\/chat/);
  assert.match(sidecar, /open_bluebird/);
  assert.match(sidecar, /open_rarity/);
  assert.match(sidecar, /Bluebird’s home is not Rarity’s room/);
  assert.doesNotMatch(sidecar, /arcsweep:guide-query/);
  assert.match(flameRoute, /createRarityFlameHandler/);
  assert.match(flameRoute, /flameId === 'rarity'/);
  assert.match(rarityRuntime, /Qwen\/Qwen3-8B/);
  assert.match(rarityRuntime, /RARITY_MODEL/);
  assert.match(rarityRuntime, /flame_id:\s*'rarity'/);
  assert.match(rarityRuntime, /singsenochian\/rarity-qwen3-8b-lora-v0\.1/);
});
