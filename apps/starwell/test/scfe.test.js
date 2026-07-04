import assert from 'node:assert/strict';
import test from 'node:test';

import fixtures from './fixtures/scfe-ephemeris-fixtures.json' with { type: 'json' };
import { angularDistance, calculateBarbaultIndex } from '../src/scfe/barbault.js';
import { detectAspects, detectConfigurations } from '../src/scfe/aspects.js';
import {
  compareEphemerisLongitudes,
  findEphemerisFixture,
} from '../src/scfe/ephemeris-comparison.js';
import { createManualEphemerisState, getLongitudesFromEphemeris } from '../src/scfe/ephemeris.js';
import {
  getGeocentricEcliptic,
  normalizeDegrees,
  radiansToDegrees,
} from '../src/scfe/providers/astronomia-provider.js';
import {
  clearLocalArchive,
  readLocalArchive,
  removeLocalArchiveEntry,
  saveSnapshotToLocalArchive,
} from '../src/scfe/local-archive.js';
import { createFieldSnapshot, DEFAULT_SCFE_INPUT } from '../src/scfe/orchestrator.js';

const july2026Longitudes = {
  jupiter: 126,
  saturn: 14,
  uranus: 62,
  neptune: 4,
  pluto: 307,
};

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

test('angularDistance always returns the shortest zodiac arc', () => {
  assert.equal(angularDistance(350, 10), 20);
  assert.equal(angularDistance(10, 350), 20);
  assert.equal(angularDistance(126, 307), 179);
});

test('calculateBarbaultIndex rejects out-of-range manual longitudes', () => {
  assert.throws(
    () => calculateBarbaultIndex({ ...july2026Longitudes, jupiter: 360 }),
    /0 <= value < 360/
  );
});

test('manual ephemeris adapter preserves downstream longitude contract', () => {
  const ephemeris = createManualEphemerisState({
    longitudes: july2026Longitudes,
    target_timestamp: DEFAULT_SCFE_INPUT.target_timestamp,
    timezone: DEFAULT_SCFE_INPUT.timezone,
  });

  assert.equal(ephemeris.provider, 'manual_longitudes');
  assert.equal(ephemeris.positions.jupiter.sign, 'Leo');
  assert.deepEqual(getLongitudesFromEphemeris(ephemeris), july2026Longitudes);
});

test('ephemeris fixture comparison can pass and request review', () => {
  const selfFixture = findEphemerisFixture(fixtures, {
    target_timestamp: DEFAULT_SCFE_INPUT.target_timestamp,
    provider: 'manual_longitudes',
  });
  const selfComparison = compareEphemerisLongitudes({
    sourceLongitudes: july2026Longitudes,
    referenceLongitudes: selfFixture.reference_longitudes,
    tolerance_degrees: selfFixture.tolerance_degrees,
    reference_source: selfFixture.id,
  });

  assert.equal(selfComparison.status, 'within_tolerance');
  assert.equal(selfComparison.worst_delta_degrees, 0);

  const offsetFixture = fixtures.find((fixture) => fixture.id === 'manual-july-2026-review-offset');
  const offsetComparison = compareEphemerisLongitudes({
    sourceLongitudes: july2026Longitudes,
    referenceLongitudes: offsetFixture.reference_longitudes,
    tolerance_degrees: offsetFixture.tolerance_degrees,
    reference_source: offsetFixture.id,
  });

  assert.equal(offsetComparison.status, 'needs_review');
  assert.equal(offsetComparison.body_deltas.jupiter.delta_degrees, 0.5);
});

test('astronomia provider helpers normalize angles and geocentric vectors', () => {
  assert.equal(normalizeDegrees(-5), 355);
  assert.equal(normalizeDegrees(365), 5);
  assert.equal(radiansToDegrees(Math.PI), 180);

  const ecliptic = getGeocentricEcliptic(
    { lon: 0, lat: 0, range: 5 },
    { lon: Math.PI, lat: 0, range: 1 }
  );

  assert.equal(Number(ecliptic.longitude.toFixed(3)), 0);
  assert.equal(Number(ecliptic.latitude.toFixed(3)), 0);
});

test('calculateBarbaultIndex sums all ten slow-planet distances', () => {
  const result = calculateBarbaultIndex(july2026Longitudes);

  assert.equal(result.cyclic_index, 832);
  assert.equal(result.compression_level, 'wide_distribution');
  assert.equal(Object.keys(result.pairwise_distances).length, 10);
  assert.equal(result.pairwise_distances.jupiter_pluto, 179);
});

test('detectAspects flags the July 2026 basket/cradle candidate ingredients', () => {
  const aspects = detectAspects(july2026Longitudes);
  const configurations = detectConfigurations(aspects, july2026Longitudes);

  assert.ok(aspects.some((aspect) => aspect.aspect_type === 'opposition'));
  assert.ok(aspects.filter((aspect) => ['trine', 'sextile'].includes(aspect.aspect_type)).length >= 3);
  assert.ok(configurations.some((configuration) => configuration.configuration_type === 'basket_cradle_candidate'));
});

test('createFieldSnapshot returns a read-only unified field packet', () => {
  const snapshot = createFieldSnapshot(DEFAULT_SCFE_INPUT);

  assert.equal(snapshot.schema_version, 'scfe.field_snapshot.v0.1');
  assert.equal(snapshot.ephemeris.provider, 'manual_longitudes');
  assert.equal(snapshot.ephemeris_comparison.status, 'within_tolerance');
  assert.equal(snapshot.ephemeris_comparison.reference_source, 'manual_default_self_check');
  assert.equal(snapshot.barbault.cyclic_index, 832);
  assert.equal(snapshot.barbault.configuration_review.status, 'candidate_needs_review');
  assert.equal(snapshot.sacred_geometry.primary_form, 'cradle_vessel');
  assert.equal(snapshot.deep.field_label, 'threshold_vessel');
  assert.equal(snapshot.terra_aeterna.canon_candidate, false);
  assert.equal(snapshot.evidence_labels.frequency, 'evidence_informed_not_medical');
  assert.ok(Array.isArray(snapshot.barbault.aspects));
  assert.ok(snapshot.barbault.aspects.length > 0);
});

test('somatic safety suppresses sound recommendations', () => {
  const snapshot = createFieldSnapshot({
    ...DEFAULT_SCFE_INPUT,
    somatic: {
      ...DEFAULT_SCFE_INPUT.somatic,
      migraine: true,
    },
  });

  assert.equal(snapshot.somatic.interface_safety_mode, 'low_light_silent');
  assert.equal(snapshot.frequency_protocol, null);
});

test('body-no fully pauses agency and sound', () => {
  const snapshot = createFieldSnapshot({
    ...DEFAULT_SCFE_INPUT,
    somatic: {
      ...DEFAULT_SCFE_INPUT.somatic,
      body_no: 'not today',
    },
  });

  assert.equal(snapshot.somatic.interface_safety_mode, 'paused');
  assert.equal(snapshot.frequency_protocol, null);
  assert.equal(snapshot.agency.energy_cost, 'none');
  assert.equal(snapshot.deep.field_label, 'paused_by_body');
});

test('local archive queue stores, removes, and clears snapshots without backend writes', () => {
  const storage = createMemoryStorage();
  const snapshot = createFieldSnapshot(DEFAULT_SCFE_INPUT);

  const saved = saveSnapshotToLocalArchive(snapshot, storage);
  assert.equal(saved.length, 1);
  assert.equal(readLocalArchive(storage).length, 1);
  assert.equal(readLocalArchive(storage)[0].id, snapshot.snapshot_id);

  const removed = removeLocalArchiveEntry(snapshot.snapshot_id, storage);
  assert.equal(removed.length, 0);
  assert.equal(readLocalArchive(storage).length, 0);

  saveSnapshotToLocalArchive(snapshot, storage);
  const cleared = clearLocalArchive(storage);
  assert.equal(cleared.length, 0);
  assert.equal(readLocalArchive(storage).length, 0);
});
