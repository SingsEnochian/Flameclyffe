'use strict';

const { createHash } = require('node:crypto');
const { toCanonicalJson } = require('./wayglass-stop-receipt.cjs');

const THOUGHT_VIBRATION_OPERATOR_SCHEMA = 'wayglass.specialist-operator/thought-vibration-v2';
const THOUGHT_VIBRATION_RECEIPT_SCHEMA = 'thought-vibration.receipt/v1';
const THOUGHT_VIBRATION_SESSION_SCHEMA = 'thought-vibration.session/v1';
const THOUGHT_VIBRATION_RECEIPT_INSPECTION_SCHEMA = 'wayglass.specialist-receipt-inspection/thought-vibration-v1';
const CLAIM_DOMAINS = Object.freeze([
  'ENGINE-TRUE',
  'OBSERVATION-TRUE',
  'CANON-TRUE',
  'SYMBOLIC',
  'UNKNOWN',
  'REJECTED',
]);
const MODES = Object.freeze([
  'mythic-composition',
  'acoustic-engineering',
  'quantum-simulation',
  'combined-experiment',
]);

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(clean(value, 64));
}

function operatorDescriptor() {
  return Object.freeze({
    schema: THOUGHT_VIBRATION_OPERATOR_SCHEMA,
    operator_id: 'thought-vibration-ai',
    version: '2.0.0',
    label: 'Thought Vibration AI · Wayglass Mythiences Operator',
    status: 'integrated-reference',
    governing_math: 'hearthgate.math-spine/v1.8',
    modes: MODES,
    claim_domains: CLAIM_DOMAINS,
    modules: Object.freeze({
      mythic: 'symbolic-authored-state',
      audio: 'offline-diagnostic-renderer',
      quantum: 'dimensionless-single-qubit-reference',
      haptics: 'adapter-required',
      device_playback: 'adapter-required',
      osia_3: 'endpoint-routing-only-no-fitting-control',
    }),
    endpoints: Object.freeze({
      descriptor: '/api/v1/wayglass/thought-vibration',
      render: '/api/v1/wayglass/thought-vibration/render',
      quantum: '/api/v1/wayglass/thought-vibration/quantum',
      receipt_inspection: '/api/v1/wayglass/thought-vibration/receipt/inspect',
    }),
    authority: Object.freeze({
      scope: 'specialist-observation-and-render-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      continuity_commit: false,
      authority_grant: false,
      device_activation: false,
      audiological_fitting_control: false,
    }),
  });
}

function inspectThoughtVibrationReceipt(receipt) {
  const blocking = [];
  const warnings = [];
  const value = receipt && typeof receipt === 'object' ? receipt : {};

  if (value.schema !== THOUGHT_VIBRATION_RECEIPT_SCHEMA) blocking.push('schema-mismatch');
  if (!clean(value.session_id, 128)) blocking.push('missing-session-id');
  if (!['offline-rendered', 'stopped', 'failed'].includes(value.status)) blocking.push('invalid-status');
  if (!clean(value.renderer_id, 180)) blocking.push('missing-renderer-id');
  if (!clean(value.source_id, 256)) blocking.push('missing-source-id');
  if (!isSha256(value.input_file_sha256)) blocking.push('invalid-input-sha256');
  if (!isSha256(value.wave_file_sha256)) blocking.push('invalid-wave-sha256');

  const format = value.format && typeof value.format === 'object' ? value.format : {};
  if (format.sample_rate_hz !== 48000) blocking.push('unexpected-sample-rate');
  if (![1, 2].includes(format.channels)) blocking.push('invalid-channel-count');
  if (format.bit_depth !== 16) blocking.push('unexpected-bit-depth');
  if (!Number.isInteger(format.frames) || format.frames < 1) blocking.push('invalid-frame-count');
  if (format.endian !== 'little' || format.codec !== 'pcm') blocking.push('unsupported-wave-format');

  const measurements = value.measurements && typeof value.measurements === 'object' ? value.measurements : {};
  for (const key of ['sample_peak', 'rms', 'dc_offset']) {
    if (!Array.isArray(measurements[key]) || measurements[key].length < 1 || measurements[key].length > 2) {
      blocking.push('invalid-measurement-' + key);
    }
  }
  if (measurements.integrated_lufs !== null) warnings.push('lufs-present-review-meter-provenance');
  if (measurements.true_peak_dbtp !== null) warnings.push('true-peak-present-review-meter-provenance');
  if (measurements.roughness !== null) warnings.push('roughness-present-review-model-provenance');

  if (!Array.isArray(value.claims)) blocking.push('claims-not-array');
  else {
    for (const claim of value.claims) {
      if (!claim || !CLAIM_DOMAINS.includes(claim.domain) || !clean(claim.statement, 4000)) {
        blocking.push('invalid-claim');
        break;
      }
    }
  }

  const continuity = value.continuity && typeof value.continuity === 'object' ? value.continuity : {};
  if (!Array.isArray(continuity.unresolved_questions)) blocking.push('invalid-continuity-questions');

  return Object.freeze({
    schema: THOUGHT_VIBRATION_RECEIPT_INSPECTION_SCHEMA,
    status: blocking.length ? 'rejected' : 'accepted-for-provenance',
    receipt_valid: blocking.length === 0,
    session_id: clean(value.session_id, 128) || null,
    source_id: clean(value.source_id, 256) || null,
    grants_authority: false,
    promotes_canon: false,
    mutates_identity: false,
    mutates_relationships: false,
    blocking: Object.freeze(blocking),
    warnings: Object.freeze(warnings),
  });
}

function thoughtVibrationReceiptRef(receipt) {
  const inspection = inspectThoughtVibrationReceipt(receipt);
  if (!inspection.receipt_valid) {
    throw new Error('Thought Vibration receipt rejected: ' + inspection.blocking.join(', '));
  }
  const digest = createHash('sha256')
    .update(toCanonicalJson(receipt), 'utf8')
    .digest('hex');
  return 'thought-vibration.receipt/v1:sha256:' + digest;
}

function normalizeThoughtVibrationDomainReceipts(receipts = []) {
  if (!Array.isArray(receipts)) throw new TypeError('Thought Vibration receipts must be an array.');
  return Object.freeze(receipts.map((receipt) => {
    const receipt_ref = thoughtVibrationReceiptRef(receipt);
    return Object.freeze({
      operator_id: 'thought-vibration-ai',
      operator_version: '2.0.0',
      schema: THOUGHT_VIBRATION_RECEIPT_SCHEMA,
      receipt_ref,
      receipt: Object.freeze({ ...receipt }),
      authority: Object.freeze({
        scope: 'specialist-receipt-provenance-only',
        canon_commit: false,
        identity_commit: false,
        relationship_commit: false,
        authority_grant: false,
      }),
    });
  }));
}

module.exports = {
  THOUGHT_VIBRATION_OPERATOR_SCHEMA,
  THOUGHT_VIBRATION_RECEIPT_SCHEMA,
  THOUGHT_VIBRATION_SESSION_SCHEMA,
  THOUGHT_VIBRATION_RECEIPT_INSPECTION_SCHEMA,
  CLAIM_DOMAINS,
  MODES,
  operatorDescriptor,
  inspectThoughtVibrationReceipt,
  thoughtVibrationReceiptRef,
  normalizeThoughtVibrationDomainReceipts,
};
