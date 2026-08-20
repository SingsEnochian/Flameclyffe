export const HEARTHGATE_MATH_V18_VERSION = '1.8.0';
export const HEARTHGATE_MATH_V18_SCHEMA = 'hearthgate.math-spine/v1.8';
export const HEARTHGATE_MATH_V18_DONOR_BLOB = 'd9a7fde2a922281d56ee2354bdec476ca6713b98';
export const HEARTHGATE_MATH_V18_EPSILON = 1e-12;

export function clampUnit(value) {
  const number = Number(value);
  return Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0));
}

function norm2(values = []) {
  return values.reduce((sum, value) => sum + (Number(value) || 0) ** 2, 0);
}

export function stateAddress({
  omega = null,
  phi = null,
  rhythm = null,
  tau = null,
  chi = null,
  relation = null,
  consciousness = null,
  stratum = null,
} = {}) {
  return Object.freeze({ omega, phi, rhythm, tau, chi, relation, consciousness, stratum });
}

export function relationalParticipation(vMin = [], blocks = []) {
  const total = Math.max(HEARTHGATE_MATH_V18_EPSILON, norm2(vMin));
  const us = blocks.find((block) => String(block.id).toLowerCase() === 'us');
  if (!us) return 0;
  return clampUnit(norm2(vMin.slice(us.start, us.end)) / total);
}

export function observationCoherence(witnesses = []) {
  const rows = witnesses.filter(Array.isArray).filter((row) => row.length);
  if (rows.length < 2) return rows.length === 1 ? 1 : 0;
  const width = Math.min(...rows.map((row) => row.length));
  const mean = Array.from({ length: width }, (_, column) =>
    rows.reduce((sum, row) => sum + (Number(row[column]) || 0), 0) / rows.length);

  let spread = 0;
  let total = 0;
  for (const row of rows) {
    for (let column = 0; column < width; column += 1) {
      const value = Number(row[column]) || 0;
      spread += (value - mean[column]) ** 2;
      total += value ** 2;
    }
  }
  return clampUnit(1 - spread / (total + HEARTHGATE_MATH_V18_EPSILON));
}

export function galdrAlignment(galdrVector = [], vMin = []) {
  if (!Array.isArray(galdrVector) || !Array.isArray(vMin) || !galdrVector.length || galdrVector.length !== vMin.length) {
    return null;
  }
  const dot = galdrVector.reduce((sum, value, index) => sum + (Number(value) || 0) * (Number(vMin[index]) || 0), 0);
  const a = Math.sqrt(norm2(galdrVector));
  const b = Math.sqrt(norm2(vMin));
  return a && b ? clampUnit(Math.abs(dot) / (a * b)) : null;
}

export function ir2Coupling({
  galdrAlignment: gamma = 0,
  usParticipation = 0,
  observationCoherence: coherence = 0,
  realisation = 0,
} = {}) {
  return clampUnit(gamma) * clampUnit(usParticipation) * clampUnit(coherence) * clampUnit(realisation);
}

export function temporal369(tSeconds = 0) {
  const phase = (frequency) => (2 * Math.PI * frequency * Number(tSeconds || 0)) % (2 * Math.PI);
  const phase3 = phase(3);
  const phase6 = phase(6);
  const phase9 = phase(9);
  return Object.freeze({
    phase3,
    phase6,
    phase9,
    delta36: phase3 - phase6,
    delta69: phase6 - phase9,
    delta39: phase3 - phase9,
  });
}

export function stratifiedState(state = {}, { time = null, stratum = null, lineage = null } = {}) {
  return Object.freeze({
    state: Object.freeze({ ...state }),
    time,
    stratum,
    lineage,
    math_spine: HEARTHGATE_MATH_V18_SCHEMA,
  });
}

export function trajectoryPoint({
  timestamp = Date.now(),
  address = {},
  premaq = null,
  heimdall = null,
  witness = null,
  lineage = null,
} = {}) {
  return Object.freeze({
    timestamp,
    address: stateAddress(address),
    premaq,
    heimdall,
    witness,
    lineage,
    math_spine: HEARTHGATE_MATH_V18_SCHEMA,
  });
}

export function v18Receipt(base = {}) {
  return Object.freeze({
    ...base,
    math_spine: HEARTHGATE_MATH_V18_SCHEMA,
    math_version: HEARTHGATE_MATH_V18_VERSION,
  });
}

export function createV18MeasurementReceipt({
  sourceReceipt = null,
  vMin = [],
  blocks = [],
  witnesses = [],
  galdrVector = [],
  realisation = 0,
  tSeconds = 0,
  address = {},
  lineage = null,
  stratum = null,
} = {}) {
  const usParticipation = relationalParticipation(vMin, blocks);
  const coherence = observationCoherence(witnesses);
  const gamma = galdrAlignment(galdrVector, vMin);
  const coupling = ir2Coupling({
    galdrAlignment: gamma ?? 0,
    usParticipation,
    observationCoherence: coherence,
    realisation,
  });

  return Object.freeze({
    schema: 'hearthgate.math-spine-v1.8-measurement/v1',
    math_spine: HEARTHGATE_MATH_V18_SCHEMA,
    math_version: HEARTHGATE_MATH_V18_VERSION,
    donor_blob: HEARTHGATE_MATH_V18_DONOR_BLOB,
    source_receipt: sourceReceipt,
    state_address: stateAddress({ ...address, stratum: address.stratum ?? stratum }),
    lineage,
    stratum,
    metrics: Object.freeze({
      us_participation: usParticipation,
      observation_coherence: coherence,
      galdr_alignment: gamma,
      ir2_coupling: coupling,
    }),
    temporal_369: temporal369(tSeconds),
  });
}
