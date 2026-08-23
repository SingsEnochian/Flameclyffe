export const QUALIA_REPORT_SCHEMA = 'premaqc.qualia-report/v1';

function text(value) {
  return String(value ?? '').trim();
}

function optionalUnit(value, label, minimum = 0, maximum = 1) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new TypeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

export function normaliseQualiaReport(input) {
  if (typeof input === 'number') {
    throw new TypeError('Qualia is not a magnitude. Provide a firsthand report instead of a scalar Q value.');
  }
  const source = typeof input === 'string' ? { text: input } : input;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('A firsthand Qualia report is required.');
  }
  const reportText = text(source.text ?? source.free_text ?? source.report);
  if (!reportText) throw new TypeError('Describe what the state is like from within.');
  return Object.freeze({
    text: reportText,
    texture: text(source.texture) || null,
    bodily: text(source.bodily) || null,
    affective: text(source.affective) || null,
    cognitive: text(source.cognitive) || null,
    temporal: text(source.temporal) || null,
    relational: text(source.relational) || null,
    intensity: optionalUnit(source.intensity, 'Qualia intensity'),
    valence: optionalUnit(source.valence, 'Qualia valence', -1, 1),
  });
}

export function createQualiaRecord(input, {
  receiptId,
  observedAt = new Date().toISOString(),
} = {}) {
  if (!receiptId) throw new TypeError('Qualia requires a receipt identity.');
  const report = normaliseQualiaReport(input);
  return Object.freeze({
    schema: QUALIA_REPORT_SCHEMA,
    present: true,
    authority: 'firsthand-only',
    inferred: false,
    report_receipt_id: receiptId,
    observed_at: observedAt,
    report,
  });
}

export function emptyQualiaRecord({ legacyScalar = null } = {}) {
  return Object.freeze({
    schema: QUALIA_REPORT_SCHEMA,
    present: false,
    authority: 'firsthand-only',
    inferred: false,
    report_receipt_id: null,
    observed_at: null,
    report: null,
    legacy_scalar: Number.isFinite(Number(legacyScalar)) ? Number(legacyScalar) : null,
  });
}

export function qualiaPresenceBit(qualia) {
  return qualia?.present === true ? 1 : 0;
}

export function qualiaComponent(qualia, contributors = []) {
  return Object.freeze({
    value: qualiaPresenceBit(qualia),
    derivative: 0,
    uncertainty: 0,
    confidence: 1,
    contributors: Object.freeze([...contributors]),
    uncertain: false,
    semantics: 'firsthand-report-presence-bit',
  });
}

export function qualiaPromptSummary(premaqc) {
  const qualia = premaqc?.qualia;
  if (!qualia?.present) return 'Q=unreported';
  return `Q=reported (firsthand; ${qualia.report_receipt_id || 'receipt unavailable'})`;
}
