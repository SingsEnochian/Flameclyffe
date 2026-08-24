const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_DEEP_TIME_ASH: ${message}`);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, finite(value)));
}

function stateValues(record) {
  return Object.fromEntries(AXES.map((axis) => [axis, finite(record?.premaqc?.state?.[axis]?.value)]));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function ashHistoryFromDeepTimeRecords(records = [], { worldId = null, halfLifeRecords = 12 } = {}) {
  invariant(Array.isArray(records), 'DEEPTime records must be an array');
  const halfLife = finite(halfLifeRecords, 12);
  invariant(halfLife > 0, 'halfLifeRecords must be positive');
  const usable = records
    .filter((record) => record?.dataset_kind === 'deep_time' && (!worldId || record.world_id === worldId))
    .sort((left, right) => Number(left.lambda) - Number(right.lambda));
  if (usable.length < 2) return Object.freeze([]);

  const receipts = [];
  for (let index = 1; index < usable.length; index += 1) {
    const previous = usable[index - 1];
    const current = usable[index];
    const priorState = stateValues(previous);
    const nextState = stateValues(current);
    const direction = Object.fromEntries(AXES.map((axis) => [axis, nextState[axis] - priorState[axis]]));
    const stateChange = mean(AXES.map((axis) => Math.abs(direction[axis])));
    const persistence = 2 ** (-(usable.length - 1 - index) / halfLife);
    const quality = clamp01(current.quality?.data_quality ?? 1);
    receipts.push(Object.freeze({
      receipt_id: current.id,
      source: 'accepted-deep-time-trajectory',
      state_change: stateChange,
      persistence,
      receipt_confidence: quality,
      consequence_weight: 1,
      direction: Object.freeze(direction),
      source_record_fingerprint: current.record_fingerprint || null,
      previous_record_id: previous.id,
      sequence_id: current.sequence_id,
      lambda: current.lambda,
    }));
  }
  return Object.freeze(receipts);
}
