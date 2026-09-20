export const VALA_MATRIX_FRAME_CONTRACT_SCHEMA = 'arcsweep.vala-matrix-frame-contract/v1';

const finite = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function assertProjectedCoordinates(value) {
  if (!Array.isArray(value) || value.length < 3) {
    throw new TypeError('projectedCoordinates must contain at least three numeric values.');
  }
  const projected = value.map(Number);
  if (projected.some((item) => !Number.isFinite(item))) {
    throw new TypeError('projectedCoordinates must contain only finite numbers.');
  }
  return Object.freeze(projected);
}

export function buildValaMatrixInsert({
  step,
  observedAt,
  projectedCoordinates,
  sourceReceipt,
  checkpointDigest = null,
  provenance = 'UNSPECIFIED',
  persistence = 'unposted',
  valaWritten = false,
  realtimeObserved = false,
} = {}) {
  const safeStep = finite(step);
  if (!Number.isInteger(safeStep) || safeStep < 0) {
    throw new TypeError('step must be a non-negative integer.');
  }

  const timestampText = String(observedAt || '').trim();
  const timestampMs = Date.parse(timestampText);
  if (!timestampText || Number.isNaN(timestampMs)) {
    throw new TypeError('observedAt must be an ISO-compatible timestamp.');
  }

  if (!sourceReceipt || typeof sourceReceipt !== 'object' || Array.isArray(sourceReceipt)) {
    throw new TypeError('sourceReceipt must be an object.');
  }

  const projected = assertProjectedCoordinates(projectedCoordinates);

  return Object.freeze({
    step: safeStep,
    raw_coordinates: Object.freeze({
      schema: VALA_MATRIX_FRAME_CONTRACT_SCHEMA,
      provenance: String(provenance),
      persistence: String(persistence),
      vala_written: valaWritten === true,
      realtime_observed: realtimeObserved === true,
      checkpoint_digest: checkpointDigest || null,
      source_receipt: sourceReceipt,
    }),
    projected_coordinates: projected,
    timestamp: timestampMs / 1000,
  });
}

export function normalizeStoredValaMatrixRow(row) {
  if (!row || typeof row !== 'object') return null;
  const id = finite(row.id);
  const step = finite(row.step);
  const timestamp = finite(row.timestamp);
  if (!Number.isFinite(id) || !Number.isFinite(step) || !Number.isFinite(timestamp)) return null;

  return Object.freeze({
    id,
    step,
    timestamp,
    created_at: row.created_at || null,
    raw_coordinates: row.raw_coordinates ?? null,
    projected_coordinates: row.projected_coordinates ?? null,
  });
}

export const VALA_MATRIX_COLUMN_CONTRACT = Object.freeze({
  id: 'database-generated identity',
  step: 'producer-supplied non-negative integer sequence',
  raw_coordinates: 'receipt envelope including provenance, persistence, digest, and source receipt',
  projected_coordinates: 'numeric render coordinates; first three feed Hearthgate x/y/z projection',
  timestamp: 'producer observation time expressed as Unix seconds',
  created_at: 'database-generated UTC insertion timestamp',
});
