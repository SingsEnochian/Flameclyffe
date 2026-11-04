import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  runNikolaStationWitness, NIKOLA_STATION_WITNESS_SCHEMA,
} from '../src/nikola-station-witness.js';
import {
  NIKOLA_SPIRAL_RECEIPT_SCHEMA,
} from '../../starwell/src/math-spine/nikola-upward-spiral.js';

test('Nikola station genuinely invokes canonical Math Spine and returns one replay-verified receipt', async () => {
  const outcome = await runNikolaStationWitness();
  assert.equal(outcome.schema, NIKOLA_STATION_WITNESS_SCHEMA);
  assert.equal(outcome.tool_id, 'nikola-upward-spiral');
  assert.equal(outcome.execution, 'browser-local-canonical-math-spine');
  assert.equal(outcome.source_class, 'synthetic');
  assert.equal(outcome.receipt.schema, NIKOLA_SPIRAL_RECEIPT_SCHEMA);
  assert.equal(outcome.receipt.cycle, 1);
  assert.equal(outcome.receipt.status, 'admitted');
  assert.equal(outcome.receipt.measurement.kind, 'stiffness');
  assert.equal(outcome.receipt.measurement.value, 24);
  assert.equal(outcome.receipt.measurement.unit, 'N/m');
  assert.equal(outcome.receipt.source.family, 'synthetic-measurement-family-0');
  assert.equal(outcome.replay.matched, true);
  assert.equal(outcome.replay.rounds, 1);
  assert.match(outcome.receipt.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(outcome.receipt.fingerprint, outcome.replay.head_fingerprint);
  assert.equal(outcome.projection.evidence_state,
    'conditional-on-caller-declared-independent-measurement');
  assert.equal(outcome.physical_observation_verified, false);
  assert.equal(outcome.provider_invoked, false);
  assert.equal(outcome.persistently_committed, false);
});

test('Nikola witness is replay-deterministic, without inventing another instrument', async () => {
  const first = await runNikolaStationWitness();
  const again = await runNikolaStationWitness();
  assert.equal(again.receipt.fingerprint, first.receipt.fingerprint);
  assert.deepEqual(again.replay, first.replay);
  assert.equal(first.receipt.from_fingerprint, first.replay.origin_fingerprint);
  assert.equal(Object.isFrozen(first), true);
});

test('the one-receipt witness only runs on Nikola station explicit click, with teardown', () => {
  const surface = readFileSync(new URL('../src/surfaces/nikola-lab.js', import.meta.url), 'utf8');
  assert.match(surface, /id="nikola-first-witness"/);
  assert.match(surface, /witnessButton\.addEventListener\('click', runFirstWitness\)/);
  assert.match(surface, /await runNikolaStationWitness\(\)/);
  assert.match(surface, /JSON\.stringify\(outcome, null, 2\)/);
  assert.match(surface, /witnessButton\.removeEventListener\('click', runFirstWitness\)/);
  assert.doesNotMatch(surface, /setInterval\([^)]*runFirstWitness/);
});
