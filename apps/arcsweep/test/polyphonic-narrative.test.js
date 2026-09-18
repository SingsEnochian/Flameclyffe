import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiegeticProvenance,
  buildNameLineage,
  buildMnemonicEcology,
  buildPalimpsestPlace,
  preserveProductiveApocrypha,
  evaluatePolyphonicTransition,
  classifyErasure,
} from '../src/polyphonic-narrative-contract.js';

test('diegetic provenance stays separate from system source receipts', () => {
  const record = buildDiegeticProvenance({
    claimId: 'caelwyn-origin',
    worldId: 'hollow-vale',
    hops: [
      { actor_or_carrier: 'village tradition', medium: 'oral', action: 'retold' },
      { actor_or_carrier: 'monastic copyist', medium: 'manuscript', action: 'translated' },
    ],
    sourceReceipts: ['source:author-site'],
  });
  assert.equal(record.hops.length, 2);
  assert.deepEqual(record.source_receipts, ['source:author-site']);
  assert.match(record.rule, /remain distinct/);
});

test('name lineage records authority and consent without equating name with identity', () => {
  const lineage = buildNameLineage({
    entityId: 'river-goddess',
    names: [
      { kind: 'self-name', value: 'Old Name', authority: 'self', consent: 'yes' },
      { kind: 'imposed-name', value: 'Imperial Name', authority: 'conquest', consent: 'no' },
      { kind: 'recovered-name', value: 'Old Name', authority: 'community-recovery', consent: 'yes' },
    ],
  });
  assert.equal(lineage.names[1].kind, 'imposed-name');
  assert.equal(lineage.names[1].consent, 'no');
  assert.equal(lineage.canonical_identity_reduced_to_name, false);
});

test('mnemonic ecology allows channels to disagree without forced synthesis', () => {
  const ecology = buildMnemonicEcology({
    subjectId: 'old-city',
    channels: [
      { channel: 'archive', carrier: 'civic ledger', reliability: 'high' },
      { channel: 'song-sound', carrier: 'children\'s song', reliability: 'contested' },
      { channel: 'food-taste', carrier: 'festival bread', reliability: 'embodied' },
    ],
  });
  assert.equal(ecology.channels.length, 3);
  assert.equal(ecology.disagreement_allowed, true);
  assert.equal(ecology.synthesis_required, false);
});

test('palimpsest places preserve overlapping strata', () => {
  const place = buildPalimpsestPlace({
    placeId: 'tor',
    name: 'The Tor',
    layers: [
      { label: 'pre-conquest sacred site', kind: 'sacred' },
      { label: 'imperial naming layer', kind: 'conquest' },
      { label: 'modern archaeological layer', kind: 'archaeological' },
    ],
  });
  assert.equal(place.layers.length, 3);
  assert.equal(place.layers_may_overlap, true);
  assert.equal(place.automatic_flattening, false);
});

test('productive apocrypha deliberately preserves multiple variants', () => {
  const record = preserveProductiveApocrypha({
    subjectId: 'caelwyn-origin',
    variants: [
      { id: 'tree', label: 'Wyrm Tree', tradition: 'celestial' },
      { id: 'wanderer', label: 'Bell-Touched Wanderer', tradition: 'folk' },
    ],
    reviewedBy: 'Rowan',
  });
  assert.equal(record.status, 'productive-apocrypha');
  assert.equal(record.automatic_winner_selection, false);
  assert.equal(record.variants.length, 2);
});

test('polyphonic transitions reject forced convergence and knowledge leakage', () => {
  const ok = evaluatePolyphonicTransition({
    participants: [{ id: 'a' }, { id: 'b' }],
    unresolvedVariantsPreserved: true,
  });
  assert.equal(ok.admissible, true);
  assert.equal(ok.maximum_coherence_is_goal, false);

  const bad = evaluatePolyphonicTransition({
    participants: [{ id: 'a', agency_preserved: false }, { id: 'b' }],
    forcedAgreement: true,
    canonKnowledgeLeakedToParticipants: true,
  });
  assert.equal(bad.admissible, false);
  assert.ok(bad.reasons.includes('forced-agreement'));
  assert.ok(bad.reasons.includes('participant-knowledge-gate-breached'));
  assert.ok(bad.reasons.includes('agency-lost:a'));
});

test('erasure is evidence-bearing and cannot be inferred from absence alone', () => {
  const event = classifyErasure({
    id: 'erasure-1',
    targetId: 'old-name',
    actor: 'imperial archive',
    mechanism: 'administrative replacement',
    memoryChannelsAffected: ['archive', 'language'],
    evidence: ['receipt:1'],
    recovery: 'possible',
  });
  assert.equal(event.inferred_from_absence_only, false);
  assert.deepEqual(event.memory_channels_affected, ['archive', 'language']);
});
