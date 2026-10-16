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

function finiteArray(value, { min = -Infinity, max = Infinity } = {}) {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= 2
    && value.every((item) => typeof item === 'number'
      && Number.isFinite(item)
      && item >= min
      && item <= max);
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
  if (!clean(value.wave_file, 256)) blocking.push('missing-wave-file');

  const format = value.format && typeof value.format === 'object' ? value.format : {};
  if (format.sample_rate_hz !== 48000) blocking.push('unexpected-sample-rate');
  if (![1, 2].includes(format.channels)) blocking.push('invalid-channel-count');
  if (format.bit_depth !== 16) blocking.push('unexpected-bit-depth');
  if (!Number.isInteger(format.frames) || format.frames < 1) blocking.push('invalid-frame-count');
  if (format.endian !== 'little' || format.codec !== 'pcm') blocking.push('unsupported-wave-format');

  const measurements = value.measurements && typeof value.measurements === 'object' ? value.measurements : {};
  if (!finiteArray(measurements.sample_peak, { min: 0, max: 1 })) blocking.push('invalid-measurement-sample_peak');
  if (!finiteArray(measurements.rms, { min: 0, max: 1 })) blocking.push('invalid-measurement-rms');
  if (!finiteArray(measurements.dc_offset, { min: -1, max: 1 })) blocking.push('invalid-measurement-dc_offset');
  const correlation = measurements.stereo_correlation;
  if (correlation !== null && !(typeof correlation === 'number' && Number.isFinite(correlation) && correlation >= -1 && correlation <= 1)) {
    blocking.push('invalid-stereo-correlation');
  }
  if (measurements.integrated_lufs !== null) blocking.push('unsupported-integrated-lufs');
  if (measurements.true_peak_dbtp !== null) blocking.push('unsupported-true-peak');
  if (measurements.roughness !== null) blocking.push('unsupported-roughness');

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
  if (!(continuity.stop_point === null || typeof continuity.stop_point === 'string')) blocking.push('invalid-continuity-stop-point');
  if (!(continuity.next_owner === null || typeof continuity.next_owner === 'string')) blocking.push('invalid-continuity-next-owner');
  if (!Array.isArray(continuity.unresolved_questions)
    || !continuity.unresolved_questions.every((item) => typeof item === 'string')) {
    blocking.push('invalid-continuity-questions');
  }

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
