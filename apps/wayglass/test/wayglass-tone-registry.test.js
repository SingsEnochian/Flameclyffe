import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inspectWayglassToneReference,
  WAYGLASS_TONE_NAMESPACE,
  WAYGLASS_TONE_PROFILE_REFERENCE_SCHEMA,
  WAYGLASS_TONE_JOURNEY_REFERENCE_SCHEMA,
} from '../src/wayglass-tone-registry.js';

const base = Object.freeze({
  wayglass_tone_id: 'wayglass-tone:terra-aeterna',
  source_record_id: 'historical-source-id',
  slug: 'terra-aeterna',
  name: 'Terra Aeterna / Hearthweave',
  version: '0.2',
  source_status: 'calibration',
  owner_subsystem: 'wayglass-tone',
  product_name: 'Wayglass Tone Studio',
  source_project: 'Arkfire',
  source_storage_repository: 'SingsEnochian/Runa',
  source_storage_path: 'docs/profiles/arkfire/terra-aeterna.v0.2.json',
  legacy_source_route: '/arkfire.html?profile=terra-aeterna',
  legacy_source_schema: 'ToneProfileDefinition',
  implementation_state: 'reference-only',
  reference_schema: WAYGLASS_TONE_PROFILE_REFERENCE_SCHEMA,
  lineage: {
    arkfire_identity_preserved: true,
    source_storage_not_ownership: true,
    runa_learning: 'reference-with-permission-only',
    runa_ownership_transfer: false,
    canon_promotion: false,
  },
  source_snapshot: { parent_product: 'Arkfire Dimensional World Bridge' },
});

test('Wayglass Tone projects an Arkfire source without stealing its identity or source', () => {
  const before = structuredClone(base);
  const record = inspectWayglassToneReference(base);

  assert.equal(record.namespace, WAYGLASS_TONE_NAMESPACE);
  assert.equal(record.source.project, 'Arkfire');
  assert.equal(record.source.storage_repository, 'SingsEnochian/Runa');
  assert.equal(record.availability.active_runtime_route, null);
  assert.equal(record.availability.historical_route, '/arkfire.html?profile=terra-aeterna');
  assert.equal(record.authority.runa_source_ownership, false);
  assert.equal(record.authority.automatic_ingestion_allowed, false);
  assert.equal(record.authority.source_mutation_allowed, false);
  assert.equal(record.authority.canon_commit, false);
  assert.deepEqual(base, before);
  assert.equal(Object.hasOwn(record, 'source_snapshot'), false);
});

test('Wayglass Tone can inspect a journey under its distinct reference schema', () => {
  const row = {
    ...base,
    wayglass_tone_id: 'wayglass-tone:journey:ten-state-cognitive-roadmap',
    slug: 'ten-state-cognitive-roadmap',
    name: 'Ten-State Cognitive Roadmap',
    reference_schema: WAYGLASS_TONE_JOURNEY_REFERENCE_SCHEMA,
  };
  const record = inspectWayglassToneReference(row, { kind: 'journey' });
  assert.equal(record.kind, 'journey');
  assert.equal(record.schema, WAYGLASS_TONE_JOURNEY_REFERENCE_SCHEMA);
  assert.equal(record.source.project, 'Arkfire');
});

test('Wayglass Tone rejects Runa ownership transfer and implicit canon promotion', () => {
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    lineage: { ...base.lineage, runa_ownership_transfer: true },
  }), /Runa cannot acquire/);
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    lineage: { ...base.lineage, canon_promotion: true },
  }), /reference cannot promote canon/);
});

test('Wayglass Tone refuses invented live routes and unpermissioned Runa learning', () => {
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    implementation_state: 'live',
  }), /unverified implementation promotion/);
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    lineage: { ...base.lineage, runa_learning: 'automatic-ingestion' },
  }), /permission boundary/);
});

test('Wayglass Tone requires a distinct Wayglass namespace and historical source', () => {
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    owner_subsystem: 'arkfire-tone',
  }), /owner mismatch/);
  assert.throws(() => inspectWayglassToneReference({
    ...base,
    source_project: 'Runa',
  }), /Arkfire provenance/);
});
