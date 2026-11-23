'use strict';

const { createHash } = require('node:crypto');

const FOLD_WITNESS_SCHEMA = 'wayglass.fold-witness/v0.1';
const FOLD_WITNESS_OPERATOR = 'wayglass-fold-witness';
const AUTHORITY = Object.freeze({
  canon_commit: false,
  identity_commit: false,
  relationship_commit: false,
  authority_grant: false,
});

function canonical(value) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Fold Witness accepts JSON data only');
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function groupsFor(sources) {
  const byObservation = new Map();
  for (const source of sources) {
    const list = byObservation.get(source.observation_key) || [];
    list.push(source.source_id);
    byObservation.set(source.observation_key, list);
  }
  return [...byObservation].map(([observation_key, source_ids]) => ({
    observation_key, source_ids,
    ambiguous: source_ids.length > 1,
  }));
}

function analyse(sources) {
  const groups = groupsFor(sources);
  const n = sources.length;
  const entropy = groups.reduce((total, group) => {
    const k = group.source_ids.length;
    return total + (k / n) * Math.log2(k);
  }, 0);
  return {
    source_count: n,
    output_count: groups.length,
    ambiguous_output_count: groups.filter(group => group.ambiguous).length,
    ambiguous_source_count: groups.filter(group => group.ambiguous)
      .reduce((total, group) => total + group.source_ids.length, 0),
    output_only_identifiable_count: groups.filter(group => !group.ambiguous).length,
    conditional_entropy_bits_per_sample_uniform_prior: Number(entropy.toFixed(12)),
    groups,
  };
}

// Explicit symbolic arithmetic. This lens is not a measured physical crossing.
function digitSum(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new TypeError('Year/numerology input must be a nonnegative safe integer');
  return String(n).split('').reduce((sum, digit) => sum + Number(digit), 0);
}

function digitRoot(n) {
  let value = n;
  while (value >= 10) value = digitSum(value);
  return value;
}

function yearNumerology(firstYear, secondYear, sourceIds) {
  if (![firstYear, secondYear].every(value => Number.isInteger(value) && value >= 0 && value < 10000)) {
    throw new TypeError('Year numerology requires two calendar-year integers');
  }
  if (!Array.isArray(sourceIds) || sourceIds.length !== 2 || sourceIds.some(id => typeof id !== 'string' || !id)) {
    throw new TypeError('Year numerology requires two source IDs');
  }
  const firstDigitSum = digitSum(firstYear);
  const secondDigitSum = digitSum(secondYear);
  const firstRoot = digitRoot(firstYear);
  const secondRoot = digitRoot(secondYear);
  const yearSum = firstYear + secondYear;
  const span = Math.abs(firstYear - secondYear);
  return {
    schema: 'wayglass.symbolic-numerology/v0.1',
    source_ids: [...sourceIds],
    method: 'decimal-digit-sums-and-explicit-year-arithmetic',
    years: [firstYear, secondYear],
    digit_sums: [firstDigitSum, secondDigitSum],
    digit_roots: [firstRoot, secondRoot],
    root_sum: firstRoot + secondRoot,
    root_product: firstRoot * secondRoot,
    year_interval: span,
    interval_digit_root: digitRoot(span),
    year_sum: yearSum,
    year_sum_digit_sum: digitSum(yearSum),
    year_sum_palindrome: String(yearSum) === String(yearSum).split('').reverse().join(''),
    interpretation_register: 'symbolic-arithmetic-not-physical-evidence',
  };
}

// Calendar-year coordinates for the voyage. Country labels are not latitude/longitude.
function spacetimeCoordinates(firstYear, secondYear, sourceIds, places) {
  if (![firstYear, secondYear].every(n => Number.isInteger(n) && n >= 0 && n < 10000)
      || !Array.isArray(sourceIds) || sourceIds.length !== 2
      || sourceIds.some(id => typeof id !== 'string' || !id)
      || !Array.isArray(places) || places.length !== 2
      || places.some(place => typeof place !== 'string' || !place.trim())) {
    throw new TypeError('Spacetime lens requires two sourced calendar years and place labels');
  }
  const midpoint = (firstYear + secondYear) / 2;
  const offsets = [firstYear - midpoint, secondYear - midpoint];
  return {
    schema: 'wayglass.spacetime-coordinate-lens/v0.1',
    source_ids: [...sourceIds],
    coordinate_system: 'calendar-year-and-place-label',
    events: [firstYear, secondYear].map((year, i) => ({
      source_id: sourceIds[i], year, place: places[i],
      latitude_deg: null, longitude_deg: null, altitude_m: null,
    })),
    temporal_displacement_years: secondYear - firstYear,
    midpoint_year: midpoint,
    signed_offsets_years: offsets,
    toy_temporal_fold: {
      mapping: 'g(tau)=tau^2',
      projected_values: offsets.map(offset => offset * offset),
      critical_offset_years: 0,
      physical_fold_claim: false,
    },
    spatial_displacement: 'unknown-without-specific-locations',
    interpretation_register: 'source-geography-plus-mathematical-analogy',
  };
}

function createFoldWitness({
  witness_id, world_id, participant_id, observed_at, model_kind,
  map_id, sources, traversal = [], unresolved_questions = [], revoked_refs = [], symbolic_lenses = [], coordinate_lenses = [],
} = {}) {
  const witnessId = required(witness_id, 'witness_id');
  const worldId = required(world_id, 'world_id');
  const participantId = required(participant_id, 'participant_id');
  const observedAt = required(observed_at, 'observed_at');
  if (!['toy-jacobian', 'narrative-projection'].includes(model_kind)) {
    throw new Error('model_kind must be toy-jacobian or narrative-projection');
  }
  const mapId = required(map_id, 'map_id');
  if (!Array.isArray(sources) || sources.length < 2) throw new Error('At least two sources required');
  if (!Array.isArray(revoked_refs) || !Array.isArray(traversal) || !Array.isArray(unresolved_questions) || !Array.isArray(symbolic_lenses) || !Array.isArray(coordinate_lenses)) {
    throw new TypeError('traversal, unresolved_questions and revoked_refs must be arrays');
  }
  const ids = new Set();
  const cleanSources = sources.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Invalid source');
    const source_id = required(item.source_id, 'source_id');
    const provenance_ref = required(item.provenance_ref, 'provenance_ref');
    const observation_key = required(item.observation_key, 'observation_key');
    if (ids.has(source_id)) throw new Error('Duplicate source ID');
    ids.add(source_id);
    if (revoked_refs.includes(provenance_ref)) throw new Error('Revoked source ref');
    return {
      source_id, provenance_ref, observation_key,
      context: JSON.parse(canonical(item.context || {})),
    };
  });
  // A projection collision is not itself a measured Jacobian singularity.
  const record = {
    schema: FOLD_WITNESS_SCHEMA,
    witness_id: witnessId,
    world_id: worldId,
    participant_id: participantId,
    observed_at: observedAt,
    model_kind,
    map_id: mapId,
    empirical_jacobian_fold_observed: false,
    sources: cleanSources,
    traversal: JSON.parse(canonical(traversal)),
    unresolved_questions: [...unresolved_questions],
    symbolic_lenses: JSON.parse(canonical(symbolic_lenses)),
    coordinate_lenses: JSON.parse(canonical(coordinate_lenses)),
    revoked_refs: [...revoked_refs],
    analysis: analyse(cleanSources),
    authority: { ...AUTHORITY },
  };
  return Object.freeze({ ...record, integrity: Object.freeze({ algorithm: 'sha256', digest: digest(record), signature: false }) });
}

function inspectFoldWitness(receipt, { expected_world_id = null, expected_participant_id = null, revoked_refs = [] } = {}) {
  const blocking = [];
  if (!Array.isArray(revoked_refs)) {
    blocking.push('invalid-revocation-list');
    revoked_refs = [];
  }
  if (!receipt || receipt.schema !== FOLD_WITNESS_SCHEMA) blocking.push('schema-mismatch');
  const { integrity, ...record } = receipt && typeof receipt === 'object' ? receipt : {};
  if (integrity?.algorithm !== 'sha256' || integrity?.signature !== false || !/^[a-f0-9]{64}$/.test(integrity?.digest || '')) {
    blocking.push('invalid-integrity-envelope');
  } else {
    try { if (digest(record) !== integrity.digest) blocking.push('integrity-digest-mismatch'); }
    catch { blocking.push('non-json-payload'); }
  }
  if (expected_world_id && record.world_id !== expected_world_id) blocking.push('world-mismatch');
  if (expected_participant_id && record.participant_id !== expected_participant_id) blocking.push('participant-mismatch');
  if (Object.keys(AUTHORITY).some(key => record.authority?.[key] !== false)) blocking.push('authority-mismatch');
  if (!['toy-jacobian', 'narrative-projection'].includes(record.model_kind)) blocking.push('model-kind-mismatch');
  if (record.empirical_jacobian_fold_observed !== false) blocking.push('unsupported-empirical-fold-claim');
  if (!Array.isArray(record.sources) || record.sources.length < 2) blocking.push('missing-sources');
  else {
    const ids = new Set(record.sources.map(s => s?.source_id));
    if (ids.size !== record.sources.length) blocking.push('duplicate-source-id');
    if (record.sources.some(s => !s?.provenance_ref || !s?.observation_key)) blocking.push('incomplete-source');
    if (record.revoked_refs !== undefined && !Array.isArray(record.revoked_refs)) blocking.push('invalid-record-revocation-list');
    if (record.sources.some(s => s && typeof s === 'object' && (
      revoked_refs.includes(s.provenance_ref) ||
      (Array.isArray(record.revoked_refs) && record.revoked_refs.includes(s.provenance_ref))
    ))) blocking.push('revoked-source');
    try { if (canonical(analyse(record.sources)) !== canonical(record.analysis)) blocking.push('analysis-mismatch'); }
    catch { blocking.push('analysis-unreadable'); }
  }
  if (Array.isArray(record.symbolic_lenses)) {
    for (const lens of record.symbolic_lenses) {
      if (lens?.schema !== 'wayglass.symbolic-numerology/v0.1' || !Array.isArray(lens.source_ids) || lens.source_ids.length !== 2) {
        blocking.push('unrecognized-symbolic-lens');
        continue;
      }
      const first = record.sources?.find(item => item?.source_id === lens.source_ids[0]);
      const second = record.sources?.find(item => item?.source_id === lens.source_ids[1]);
      if (!first || !second) { blocking.push('symbolic-lens-missing-sources'); continue; }
      try {
        const expected = yearNumerology(first.context?.year, second.context?.year, lens.source_ids);
        if (canonical(lens) !== canonical(expected)) blocking.push('symbolic-numerology-mismatch');
      } catch { blocking.push('symbolic-numerology-invalid'); }
    }
  } else if (record.symbolic_lenses !== undefined) {
    blocking.push('symbolic-lenses-invalid');
  }
  if (Array.isArray(record.coordinate_lenses)) {
    for (const lens of record.coordinate_lenses) {
      if (lens?.schema !== 'wayglass.spacetime-coordinate-lens/v0.1'
          || !Array.isArray(lens.source_ids) || lens.source_ids.length !== 2) {
        blocking.push('unrecognized-coordinate-lens');
        continue;
      }
      const first = record.sources?.find(item => item?.source_id === lens.source_ids[0]);
      const second = record.sources?.find(item => item?.source_id === lens.source_ids[1]);
      if (!first || !second) { blocking.push('coordinate-lens-missing-sources'); continue; }
      try {
        const expected = spacetimeCoordinates(first.context?.year, second.context?.year,
          lens.source_ids, [first.context?.place, second.context?.place]);
        if (canonical(lens) !== canonical(expected)) blocking.push('spacetime-coordinate-mismatch');
      } catch { blocking.push('spacetime-coordinate-invalid'); }
    }
  } else if (record.coordinate_lenses !== undefined) {
    blocking.push('coordinate-lenses-invalid');
  }
  return Object.freeze({ status: blocking.length ? 'rejected' : 'accepted-for-provenance', blocking, grants_authority: false });
}

function toDomainReceipt(witness) {
  const inspected = inspectFoldWitness(witness);
  if (inspected.status !== 'accepted-for-provenance') throw new Error(`Fold Witness rejected: ${inspected.blocking.join(', ')}`);
  return Object.freeze({
    operator_id: FOLD_WITNESS_OPERATOR,
    receipt_ref: `${FOLD_WITNESS_SCHEMA}:sha256:${witness.integrity.digest}`,
    evidence: witness,
    authority: { ...AUTHORITY },
  });
}

function buildEightRayControl({ witness_id = 'fold:control:001', world_id = 'wayglass:fold-lab', participant_id = 'rowan:fold-lab', observed_at = '2026-11-01T00:00:00.000Z' } = {}) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const tidy = n => Math.abs(n) < 1e-10 ? 0 : Number(n.toFixed(12));
  const sources = names.map((name, i) => {
    const angle = (90 - i * 45) * Math.PI / 180;
    const x = tidy(Math.cos(angle));
    const y = tidy(Math.sin(angle));
    const u = tidy(x * x);
    return {
      source_id: `ray:${name}`, provenance_ref: `toy-fold:001:ray:${name}`,
      observation_key: `${u.toFixed(9)}|${y.toFixed(9)}`,
      context: { x, y, u, v: y, ray: name },
    };
  });
  return createFoldWitness({
    witness_id, world_id, participant_id, observed_at, model_kind: 'toy-jacobian',
    map_id: 'F(x,y)=(x²,y):eight-unit-ray-sample', sources,
    unresolved_questions: ['How do source receipts survive a live Wayglass stop/return?'],
  });
}

function buildWalterDreamVoyage({ observed_at = '2026-11-01T00:00:00.000Z' } = {}) {
  const world_id = 'wayglass:dream-voyage:the-children-of-lost-time';
  return createFoldWitness({
    witness_id: 'fold:dream-voyage:walter:001', world_id, participant_id: 'rowan:dream-voyage',
    observed_at, model_kind: 'narrative-projection', map_id: 'walter-name-only:source-distinction-hidden',
    sources: [
      { source_id: 'walter:older:1950:america', provenance_ref: 'rowan-dream-notes:old-man-walter-1950-america', observation_key: 'Walter',
        context: { name: 'Old Man Walter', year: 1950, place: 'America', voyage: 'The Children of LOST Time', evidence: 'Rowan-supplied notes' } },
      { source_id: 'walter:younger:1933:britain', provenance_ref: 'rowan-dream-notes:young-walter-1933-britain', observation_key: 'Walter',
        context: { name: 'Young Walter', year: 1933, place: 'Britain', voyage: 'The Children of LOST Time', evidence: 'Rowan-supplied notes' } },
    ],
    symbolic_lenses: [yearNumerology(1950, 1933, [
      'walter:older:1950:america', 'walter:younger:1933:britain',
    ])],
    coordinate_lenses: [spacetimeCoordinates(1950, 1933, [
      'walter:older:1950:america', 'walter:younger:1933:britain',
    ], ['America', 'Britain'])],
    traversal: [{ from: 'walter:older:1950:america', to: 'walter:younger:1933:britain',
      declared_by: 'Rowan', relation: 'Old Man Walter to Young Walter', mechanism: 'unresolved' }],
    unresolved_questions: [
      'What occurs at the crossing from Old Man Walter in 1950 America to Young Walter in 1933 Britain?',
      'Which distinctions survive if the observer sees only the name Walter?',
      'Is any mathematical fold observable, or is this solely a narrative projection collision?',
    ],
  });
}

module.exports = { FOLD_WITNESS_SCHEMA, FOLD_WITNESS_OPERATOR, createFoldWitness,
  inspectFoldWitness, toDomainReceipt, buildEightRayControl, buildWalterDreamVoyage, yearNumerology, spacetimeCoordinates };
