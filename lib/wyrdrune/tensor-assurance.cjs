'use strict';

// Wyrdrune Tensor Assurance v0.1.
// This compares one candidate result with the deterministic JavaScript CPU
// reference. It records scope and does not claim mathematical proof,
// trusted hardware attestation, or authenticated backend identity.

const { digest } = require('./canonical.cjs');
const { executeTensorIR } = require('./tensor-engine.cjs');

const SCHEMA = 'wyrdrune.tensor-assurance/v0.1';
const RESULT_SCHEMA = 'wyrdrune.tensor-result/v0.1';
const DEVICE_RESULT_SCHEMA = 'wyrdrune.tensor-device-result/v0.1';
const MAX_MISMATCH_SAMPLES = 32;

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(label + ' must be a plain record');
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function finiteTolerance(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(label + ' must be a finite, non-negative number');
  }
  return value;
}

function valuesArray(value, label) {
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  throw new TypeError(label + ' values must be an array or typed array');
}

function selectedOutput(result, output, label) {
  plainRecord(result, label + ' result');
  if (result.schema === RESULT_SCHEMA) {
    const outputs = plainRecord(result.outputs, label + ' outputs');
    if (!Object.hasOwn(outputs, output)) throw new ReferenceError(label + ' is missing output ' + output);
    return outputs[output];
  }
  if (result.schema === DEVICE_RESULT_SCHEMA) {
    if (result.status !== 'executed') throw new TypeError(label + ' device result was not executed');
    if (result.outputId !== output) throw new TypeError(label + ' device output id does not match ' + output);
    if (result.backend !== 'webgpu' || result.execution?.gpuExecuted !== true) {
      throw new TypeError(label + ' device result lacks an executor-reported WebGPU dispatch');
    }
    return result.output;
  }
  throw new TypeError(label + ' uses an unsupported tensor result schema');
}

function normalizeResult(result, output, expected, label) {
  const selected = selectedOutput(result, output, label);
  plainRecord(selected, label + ' output');
  if (!Array.isArray(selected.shape) ||
      selected.shape.length !== expected.shape.length ||
      selected.shape.some((dimension, index) => dimension !== expected.shape[index])) {
    throw new RangeError(label + ' output shape does not match the Tensor IR');
  }
  if (selected.dtype !== expected.dtype) throw new TypeError(label + ' output dtype does not match the Tensor IR');
  const values = valuesArray(selected.values, label + ' output');
  if (values.length !== expected.values.length) throw new RangeError(label + ' output length does not match its shape');
  for (let index = 0; index < values.length; index++) {
    if (typeof values[index] !== 'number' || !Number.isFinite(values[index])) {
      throw new RangeError(label + ' output contains a non-finite value at index ' + index);
    }
  }
  const backend = result.execution?.backend || result.backend;
  if (typeof backend !== 'string' || backend.length === 0) {
    throw new TypeError(label + ' result must identify its backend');
  }
  if (typeof result.programFingerprint !== 'string' ||
      result.programFingerprint !== expected.programFingerprint) {
    throw new TypeError(label + ' program fingerprint does not match');
  }
  if (typeof result.feedsDigest !== 'string' || result.feedsDigest !== expected.feedsDigest) {
    throw new TypeError(label + ' feed digest does not match');
  }
  return {
    backend,
    gpuExecuted: result.execution?.gpuExecuted === true || result.gpuExecuted === true,
    shape: [...selected.shape],
    dtype: selected.dtype,
    values,
    evidenceDigest: digest({
      schema: result.schema,
      programFingerprint: result.programFingerprint,
      feedsDigest: result.feedsDigest,
      backend,
      output,
      shape: selected.shape,
      dtype: selected.dtype,
      values,
    }),
  };
}

/**
 * Compare a candidate backend result against a fresh JavaScript CPU reference.
 * Absolute and relative tolerances are mandatory and recorded in the envelope.
 * The local stop signal is excluded from the canonical evidence payload.
 */
function assureTensorResult(source, feeds, output, candidateResult, options = {}) {
  plainRecord(options, 'Tensor assurance options');
  for (const key of Object.keys(options)) {
    if (!['absoluteTolerance', 'relativeTolerance', 'signal'].includes(key)) {
      throw new TypeError('Unknown tensor assurance option ' + key);
    }
  }
  const absoluteTolerance = finiteTolerance(options.absoluteTolerance, 'absoluteTolerance');
  const relativeTolerance = finiteTolerance(options.relativeTolerance, 'relativeTolerance');
  if (typeof output !== 'string' || output.length === 0) throw new TypeError('Tensor assurance requires an output id');

  const referenceResult = executeTensorIR(source, feeds, { signal: options.signal });
  if (!referenceResult.program.outputs.includes(output)) {
    throw new ReferenceError('Tensor assurance output must be declared by the Tensor IR');
  }
  const referenceOutput = referenceResult.outputs[output];
  if (!referenceOutput) throw new ReferenceError('Reference execution did not return output ' + output);

  const expected = {
    ...referenceOutput,
    programFingerprint: referenceResult.programFingerprint,
    feedsDigest: referenceResult.feedsDigest,
  };
  const reference = normalizeResult(referenceResult, output, expected, 'Reference');
  const candidate = normalizeResult(candidateResult, output, expected, 'Candidate');

  let maxAbsoluteError = 0;
  let maxRelativeError = null;
  let worstIndex = null;
  let mismatchCount = 0;
  const mismatchSamples = [];

  for (let index = 0; index < reference.values.length; index++) {
    const expectedValue = reference.values[index];
    const actualValue = candidate.values[index];
    const absoluteError = Math.abs(actualValue - expectedValue);
    if (!Number.isFinite(absoluteError)) throw new RangeError('Tensor comparison error overflow at index ' + index);
    const allowedError = absoluteTolerance + relativeTolerance * Math.abs(expectedValue);
    if (!Number.isFinite(allowedError)) throw new RangeError('Tensor tolerance overflow at index ' + index);
    if (absoluteError > maxAbsoluteError) {
      maxAbsoluteError = absoluteError;
      worstIndex = index;
    }
    if (expectedValue !== 0) {
      const relativeError = absoluteError / Math.abs(expectedValue);
      if (Number.isFinite(relativeError) &&
          (maxRelativeError === null || relativeError > maxRelativeError)) {
        maxRelativeError = relativeError;
      }
    }
    if (absoluteError > allowedError) {
      mismatchCount++;
      if (mismatchSamples.length < MAX_MISMATCH_SAMPLES) {
        mismatchSamples.push({ index, expected: expectedValue, actual: actualValue, absoluteError, allowedError });
      }
    }
  }

  const distinctBackendLabels = reference.backend !== candidate.backend;
  const comparisonStatus = mismatchCount > 0 ? 'divergent' :
    distinctBackendLabels ? 'matched-within-tolerance' : 'not-independent';

  const payload = {
    schema: SCHEMA,
    status: comparisonStatus,
    scope: 'one-declared-output-for-one-program-and-feed-set',
    subject: {
      programFingerprint: referenceResult.programFingerprint,
      feedsDigest: referenceResult.feedsDigest,
      output,
      shape: [...reference.shape],
      dtype: reference.dtype,
    },
    comparison: {
      method: 'elementwise-absolute-relative-tolerance',
      absoluteTolerance,
      relativeTolerance,
      valueCount: reference.values.length,
      mismatchCount,
      maxAbsoluteError,
      maxRelativeError,
      worstIndex,
      mismatchSamples,
    },
    backends: {
      reference: { name: reference.backend, evidenceDigest: reference.evidenceDigest },
      candidate: { name: candidate.backend, evidenceDigest: candidate.evidenceDigest },
      independence: distinctBackendLabels ? 'distinct-backend-labels-only' : 'same-backend-label',
      identityAttestation: 'not-provided',
    },
    claims: [
      { id: 'program-binding', status: 'matched', method: 'WCE-1 program fingerprint equality' },
      { id: 'feed-binding', status: 'matched', method: 'WCE-1 normalized feed digest equality' },
      { id: 'output-contract', status: 'matched', method: 'shape, dtype, length and finite-value checks' },
      { id: 'numerical-comparison', status: comparisonStatus, method: 'elementwise comparison under the recorded tolerance' },
      { id: 'backend-independence', status: distinctBackendLabels ? 'declared-not-attested' : 'not-established', method: 'backend labels are supplied by result producers' },
      { id: 'physical-execution', status: candidate.gpuExecuted ? 'executor-reported' : 'not-claimed', method: 'result metadata only; no hardware attestation' },
    ],
    limitations: [
      'A match establishes numerical agreement only for this exact program, feed set, output and recorded tolerance.',
      'It does not prove algorithmic correctness, mathematical completeness, input truth, or suitability outside this tested scope.',
      'Backend labels are caller-reported. Distinct labels do not prove independent implementation, operator, process, or hardware custody.',
      'A WebGPU dispatch flag is executor-reported, not a cryptographic hardware attestation.',
      'The WCE-1 fingerprint provides content integrity, not signer identity or authorization.',
    ],
  };
  return deepFreeze({ ...payload, fingerprint: digest(payload) });
}

/** Verify only the WCE-1 integrity of an assurance envelope, not its truth. */
function verifyTensorAssurance(envelope) {
  try {
    plainRecord(envelope, 'Tensor assurance envelope');
    if (envelope.schema !== SCHEMA || typeof envelope.fingerprint !== 'string') return false;
    const { fingerprint, ...payload } = envelope;
    return digest(payload) === fingerprint;
  } catch {
    return false;
  }
}

module.exports = { assureTensorResult, verifyTensorAssurance };
