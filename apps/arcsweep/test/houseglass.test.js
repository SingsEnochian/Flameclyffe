import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import {
  buildHouseglassSynthesisPacket,
  buildHouseglassTaskPacket,
  createDefaultHouseglassSettings,
  createHouseglassReceipt,
  finishHouseglassReceipt,
  HOUSEGLASS_ORGANS,
  HOUSEGLASS_RECEIPT_SCHEMA,
  HOUSEGLASS_SCHEMA,
  makeHouseglassScope,
  normaliseHouseglassSettings,
  normaliseHouseglassState,
  planHouseglassSwarm,
} from '../src/houseglass.js';

test('Houseglass defaults are quiet, tray-bound, and cannot publish', () => {
  const settings = createDefaultHouseglassSettings();
  assert.equal(settings.enabled, true);
  assert.equal(settings.presence, 'quiet');
  assert.equal(settings.interruptions, 'tray-only');
  assert.equal(settings.permissions.prepareLocalChanges, false);
  assert.equal('commit' in settings.permissions, false);
  assert.equal('deploy' in settings.permissions, false);
});

test('Houseglass is a shared Hearth contract with known organ adapters', () => {
  assert.equal(HOUSEGLASS_SCHEMA, 'hearthgate.houseglass/v1');
  assert.equal(HOUSEGLASS_RECEIPT_SCHEMA, 'hearthgate.houseglass-receipt/v1');
  assert.deepEqual(HOUSEGLASS_ORGANS.map(({ id }) => id), [
    'hearthgate.starwell', 'arkfire.arcsweep', 'hearthgate.bifrost',
    'hearthgate.runa', 'hearthgate.records', 'hearthgate.commons', 'hearthgate.feedback',
  ]);
});

test('Houseglass settings reject unknown modes and repair permission shapes', () => {
  const settings = normaliseHouseglassSettings({
    presence: 'clippy-ambush',
    interruptions: 'every-keystroke',
    defaultLayout: 'forehead',
    permissions: { populateFields: false, prepareLocalChanges: true },
  });
  assert.equal(settings.presence, 'quiet');
  assert.equal(settings.interruptions, 'tray-only');
  assert.equal(settings.defaultLayout, 'float');
  assert.equal(settings.permissions.populateFields, false);
  assert.equal(settings.permissions.prepareLocalChanges, true);
  assert.equal(settings.permissions.readContext, true);
});

test('automatic Houseglass routing uses a bounded quorum and a separate synthesiser', () => {
  const plan = planHouseglassSwarm({ stage: 'tend', routing: 'smallest-quorum', voices: CONSTELLATION_VOICES });
  assert.deepEqual(plan.contributorIds, ['runeweaver', 'yggdrasil']);
  assert.equal(plan.synthesizerId, 'boxfire');
  assert.equal(plan.voiceIds.length, 3);
  assert.equal(new Set(plan.voiceIds).size, plan.voiceIds.length);
});

test('selected routing remains useful with one route', () => {
  const plan = planHouseglassSwarm({ stage: 'harvest', routing: 'selected', selectedVoiceIds: ['vethrlauf'], voices: CONSTELLATION_VOICES });
  assert.deepEqual(plan.contributorIds, ['vethrlauf']);
  assert.equal(plan.synthesizerId, null);
});

test('task and synthesis packets preserve scope, authority, and disagreements', () => {
  const settings = createDefaultHouseglassSettings();
  const scope = makeHouseglassScope({ id: 'world-terra', name: 'Terra Aeterna' }, 'records', 'Records', { id: 'hearthgate.records', label: 'Records' });
  assert.equal(scope.organId, 'hearthgate.records');
  const task = buildHouseglassTaskPacket({ task: 'Populate the missing applet fields.', stage: 'seed', scope, settings });
  assert.match(task, /Records → Terra Aeterna → Records/);
  assert.match(task, /Do not claim that files, canon, settings, commits, deployments, or external systems changed/);
  const synthesis = buildHouseglassSynthesisPacket({ task: 'Populate fields.', stage: 'harvest', scope, contributions: [{ name: 'Lioreal', status: 'replied', model: 'one', text: 'Use copper.' }, { name: 'Uial', status: 'replied', model: 'two', text: 'Use green.' }] });
  assert.match(synthesis, /Preserve material disagreements/);
  assert.match(synthesis, /Lioreal/);
  assert.match(synthesis, /Uial/);
});

test('Houseglass receipts persist one synthesis over inspectable route receipts', () => {
  const scope = makeHouseglassScope({ id: 'world-one', name: 'World One' }, 'forge', 'Forge');
  const plan = planHouseglassSwarm({ stage: 'seed', routing: 'selected', selectedVoiceIds: ['lioreal', 'boxfire'], voices: CONSTELLATION_VOICES });
  const started = createHouseglassReceipt({ id: 'glass-one', task: 'Tend this seed.', stage: 'seed', scope, plan, createdAt: '2026-08-15T12:00:00.000Z' });
  assert.equal(started.schema, HOUSEGLASS_RECEIPT_SCHEMA);
  const finished = finishHouseglassReceipt(started, {
    contributions: [{ name: 'Lioreal', status: 'replied', text: 'Contribution', model: 'model-a' }],
    synthesis: { name: 'Boxfire', status: 'replied', text: 'Integrated packet', model: 'model-b' },
  }, '2026-08-15T12:01:00.000Z');
  assert.equal(finished.status, 'ready');
  assert.equal(finished.synthesis.text, 'Integrated packet');
  assert.equal(finished.contributions[0].text, 'Contribution');
  const state = normaliseHouseglassState({ activeReceiptId: 'glass-one', receipts: [finished] }, createDefaultHouseglassSettings());
  assert.equal(state.activeReceiptId, 'glass-one');
  assert.equal(state.receipts.length, 1);
});

test('Houseglass UI is summoned, dockable, section-scoped, and becomes a mobile sheet', async () => {
  const [main, css] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ]);
  assert.match(main, /let houseglassOpen = false/);
  assert.match(main, /data-action="houseglass-float"/);
  assert.match(main, /data-action="houseglass-dock-section"/);
  assert.match(main, /data-action="houseglass-dock-right"/);
  assert.match(main, /installHouseglassSectionScopes/);
  assert.match(main, /buildHouseglassSynthesisPacket/);
  assert.match(main, /invokeConstellationVoices/);
  assert.match(css, /backdrop-filter: blur\(24px\)/);
  assert.match(css, /html\[data-houseglass-solid="true"\]/);
  assert.match(css, /\.houseglass\[data-layout\] \{ position: fixed; inset: auto \.5rem 5\.8rem/);
});
