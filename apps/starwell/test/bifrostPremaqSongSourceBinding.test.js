import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PREMAQ_AXES, premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import { buildPremaqSongPlan } from '../bifrost/premaq-song.js';

const FIXED_TIME = new Date('2026-08-22T07:56:00.000Z');

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

function makeState() {
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84, Q: 0.79 };
  return premaqToTemporalState({
    schema_version: '2.0.0',
    id: 'premaq-song-source-binding-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaq-registry/2.0',
    state: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, {
      value: values[axis],
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    }])),
    receipt_id: 'premaq-song-source-binding-test-receipt',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'premaq-song-source-binding-test/1',
    provenance_refs: [],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  }, {
    clock: () => new Date(FIXED_TIME),
    idFactory: () => 'song-source-binding-state',
  });
}

function sourceBindingReceipt(source) {
  return {
    schema: 'bifrost.source-binding-receipt/v0.1',
    action_id: 'play-premaq-song',
    selected_side: 'targetside',
    source_kind: 'temporal-state',
    source_state_id: source.state_id,
    source_fingerprint: 'shared-fp',
    executable: true,
    certified_source: true,
  };
}

test('PREMAQ song plan carries Bifröst source binding receipt', () => {
  const source = makeState();
  const binding = sourceBindingReceipt(source);
  const plan = buildPremaqSongPlan({
    state: source,
    rootHz: 220,
    bpm: 84,
    sourceBindingReceipt: binding,
    sourceOrigin: 'native-action-execution-source',
  });

  assert.equal(plan.schema, 'bifrost.premaq-full-song-plan/v0.5');
  assert.equal(plan.source_state_id, source.state_id);
  assert.equal(plan.source_origin, 'native-action-execution-source');
  assert.equal(plan.selected_execution_side, 'targetside');
  assert.equal(plan.source_kind, 'temporal-state');
  assert.equal(plan.source_binding_receipt, binding);
  assert.equal(plan.cycles.at(0).from_state_id, source.state_id);
});

test('PREMAQ song source is bound from native action receipt before planning', async () => {
  const song = await read('../bifrost/premaq-song.js');

  assert.match(song, /readBoundSongSource/);
  assert.match(song, /currentSongSourceBindingReceipt/);
  assert.match(song, /sourceBindingReceipt: currentSongSourceBindingReceipt/);
  assert.match(song, /source_binding_receipt: plan\.source_binding_receipt/);
  assert.match(song, /export_source_binding_receipt/);
  assert.doesNotMatch(song, /const source = readCurrentSourceState\(\)/);
});
