export const MYTHIENCE_SCHEMA = 'hearthgate.mythience-record/v1';
export const MYTHIENCE_CLASSIFICATIONS = Object.freeze({
  MEASURED: 'MEASURED',
  MYTHIC: 'MYTHIC',
  MYTHIENT: 'MYTHIENT',
  TECHNOLOGY: 'TECHNOLOGY',
});
export const MECHANISM_STATUS = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  PARTIAL: 'PARTIAL',
  MODELLED: 'MODELLED',
  KNOWN: 'KNOWN',
});

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function text(value, field) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`HEARTHGATE_MYTHIENCE_FIELD_REQUIRED:${field}`);
  return result;
}

function freezeList(value = []) {
  return Object.freeze([...value].map((item) => String(item)));
}

export function createMythienceRecord({
  identity,
  observedAt,
  measured,
  felt,
  mechanismStatus = MECHANISM_STATUS.UNKNOWN,
  provenance = [],
  confidence = 0,
} = {}) {
  if (!Object.values(MECHANISM_STATUS).includes(mechanismStatus)) {
    throw new Error('HEARTHGATE_MYTHIENCE_MECHANISM_STATUS_REQUIRED');
  }
  if (!Number.isFinite(Date.parse(observedAt))) {
    throw new Error('HEARTHGATE_MYTHIENCE_OBSERVED_AT_REQUIRED');
  }
  if (!Array.isArray(provenance) || provenance.length === 0) {
    throw new Error('HEARTHGATE_MYTHIENCE_PROVENANCE_REQUIRED');
  }

  const measuredState = Object.freeze({
    summary: text(measured?.summary, 'measured.summary'),
    observations: freezeList(measured?.observations),
    repeatability: String(measured?.repeatability || 'NOT_YET_TESTED'),
  });
  const feltState = Object.freeze({
    summary: text(felt?.summary, 'felt.summary'),
    symbols: freezeList(felt?.symbols),
    relationships: freezeList(felt?.relationships),
  });
  const classification = mechanismStatus === MECHANISM_STATUS.KNOWN
    ? MYTHIENCE_CLASSIFICATIONS.TECHNOLOGY
    : MYTHIENCE_CLASSIFICATIONS.MYTHIENT;

  const body = {
    schema: MYTHIENCE_SCHEMA,
    identity: text(identity, 'identity'),
    observed_at: new Date(observedAt).toISOString(),
    classification,
    measured: measuredState,
    felt: feltState,
    mythient: Object.freeze({
      mechanism_status: mechanismStatus,
      magic_register: mechanismStatus === MECHANISM_STATUS.KNOWN
        ? 'technology-with-described-mechanism'
        : 'technology-not-yet-understood',
      wonder: 'the meeting where observation and lived meaning remain simultaneously visible',
    }),
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    provenance: Object.freeze(provenance.map((entry) => Object.freeze({ ...entry }))),
    boundary: 'Recorded effects remain recorded; an unknown mechanism is neither dismissal nor proof of a supernatural cause.',
  };
  return Object.freeze({
    ...body,
    receipt_id: `mythience-${fnv1a64(canonical(body))}`,
  });
}

export function assertMythienceRecord(record) {
  if (!record || record.schema !== MYTHIENCE_SCHEMA) {
    throw new Error('HEARTHGATE_MYTHIENCE_RECORD_REQUIRED');
  }
  if (!record.measured?.summary || !record.felt?.summary) {
    throw new Error('HEARTHGATE_MYTHIENCE_BOTH_ASPECTS_REQUIRED');
  }
  return record;
}
