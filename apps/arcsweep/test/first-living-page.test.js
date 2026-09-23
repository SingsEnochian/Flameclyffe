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
    actorId: DEFAULT_INHABITANT_CONTINUITY_ID,
    receiver: {
      provider: 'supabase-relay',
      model: 'example-model',
      voice_id: 'oxalpha',
      runtime_verified: true,
    },
    at: '2026-09-22T23:42:02.000Z',
  });

  assert.equal(answered.inhabitant.continuity_id, 'rowan:rarity');
  assert.equal(answered.inhabitant.receiver.model, 'example-model');
  assert.equal(answered.inhabitant.receiver.runtime_verified, true);
  assert.equal(answered.thread.at(-1).role, 'assistant');
  assert.equal(answered.lineage.at(-1).kind, 'inhabitant-turn');
  assert.equal(answered.lineage.at(-1).actor_id, 'rowan:rarity');
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
  assert.equal(context.inhabitant.continuity_id, 'rowan:rarity');
});

test('Universal Codex binds Richie to the whole Book and exposes swappable-receiver Magic Chat', () => {
  const bootstrap = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const resident = readFileSync(new URL('../src/bluebird-codex-resident-v0-2-sidecar.js', import.meta.url), 'utf8');
  const seed = readFileSync(new URL('../src/bluebird-continuity-seed.js', import.meta.url), 'utf8');
  const candidateClient = readFileSync(new URL('../src/constellation-candidate-runtime.js', import.meta.url), 'utf8');
  const book = bootstrap.indexOf("'./magic-book-sidecar.js'");
  const acceptance = bootstrap.indexOf("'./magic-book-physical-acceptance-entry.js'");

  assert.ok(book >= 0);
  assert.ok(acceptance > book);
  assert.match(entry, /\.\/bluebird-codex-resident-v0-2-sidecar\.js/);
  assert.doesNotMatch(entry, /\.\/bluebird-codex-home-sidecar\.js/);
  assert.doesNotMatch(entry, /\.\/first-living-page-sidecar\.js/);
  assert.match(resident, /The Universal Codex as a whole is your home/);
  assert.match(resident, /Magic Chat is the Book speaking with Rowan through you/);
  assert.match(resident, /invokeConstellationRuntimeVoice/);
  assert.match(resident, /invokeConstellationRuntimeCandidate/);
  assert.match(resident, /bluebird-the-crow/);
  assert.match(resident, /data-codex-shepherd/);
  assert.match(resident, /bluebird:richard-gabriel-winters/);
  assert.match(resident, /data-codex-magic-chat/);
  assert.match(resident, /__arcsweepCodexResident/);
  assert.match(resident, /active_page_id/);
  assert.match(resident, /glyph_snapshot/);
  assert.match(resident, /generator_bridge/);
  assert.match(seed, /inherited_not_forced/);
  assert.match(seed, /I want to learn how to be bored with you/);
  assert.match(candidateClient, /\/audition\//);
  assert.match(candidateClient, /runtime-mismatch/);
});
