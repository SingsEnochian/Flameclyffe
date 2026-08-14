const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function error(path, message) { return { path, message }; }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }

export function validateDeepTimeRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { valid: false, errors: [error('$', 'Record must be an object.')] };
  if (record.dataset_kind !== 'deep_time') errors.push(error('dataset_kind', 'Expected deep_time.'));
  if (record.schema_version !== '0.1.0') errors.push(error('schema_version', 'Expected schema_version 0.1.0.'));
  if (!nonEmpty(record.id)) errors.push(error('id', 'Record id is required.'));
  if (!nonEmpty(record.sequence_id)) errors.push(error('sequence_id', 'Sequence id is required.'));
  if (!Number.isInteger(record.sequence_revision) || record.sequence_revision < 1) errors.push(error('sequence_revision', 'Sequence revision must be a positive integer.'));
  if (!Number.isFinite(Number(record.lambda))) errors.push(error('lambda', 'Lambda must be finite.'));
  if (!nonEmpty(record.time?.utc) || Number.isNaN(Date.parse(record.time?.utc))) errors.push(error('time.utc', 'UTC timestamp is required.'));
  if (!Number.isFinite(Number(record.time?.julian_date))) errors.push(error('time.julian_date', 'Julian Date must be finite.'));
  if (record.time?.julian_time_scale !== 'UTC') errors.push(error('time.julian_time_scale', 'This adapter currently requires UTC Julian time scale.'));
  if (!record.premaqc || typeof record.premaqc !== 'object') errors.push(error('premaqc', 'PREMAQC snapshot is required.'));
  for (const axis of AXES) {
    if (!Number.isFinite(Number(record.premaqc?.state?.[axis]?.value))) errors.push(error(`premaqc.state.${axis}.value`, `${axis} value must be finite.`));
  }
  if (!nonEmpty(record.provenance?.observation_run_id)) errors.push(error('provenance.observation_run_id', 'Observation run id is required.'));
  if (!nonEmpty(record.provenance?.acceptance_mask_id)) errors.push(error('provenance.acceptance_mask_id', 'Acceptance mask id is required.'));
  if (!nonEmpty(record.provenance?.accepted_state_hash) || record.provenance.accepted_state_hash.length !== 64) errors.push(error('provenance.accepted_state_hash', 'Accepted state hash must be SHA-256.'));
  if (!Array.isArray(record.provenance?.source_receipt_hashes) || record.provenance.source_receipt_hashes.length === 0) errors.push(error('provenance.source_receipt_hashes', 'At least one source receipt hash is required.'));
  if (record.quality?.data_quality != null && (!Number.isFinite(Number(record.quality.data_quality)) || Number(record.quality.data_quality) < 0 || Number(record.quality.data_quality) > 1)) errors.push(error('quality.data_quality', 'Data quality must be between 0 and 1.'));
  if (record.quality && Object.prototype.hasOwnProperty.call(record.quality, 'Q')) errors.push(error('quality.Q', 'Engineering data quality must not be stored as Q.'));
  if (record.authority?.append_only !== true) errors.push(error('authority.append_only', 'DEEPTime records must be append-only.'));
  if (record.authority?.qualia_is_premaqc_q !== true) errors.push(error('authority.qualia_is_premaqc_q', 'Qualia must remain PREMAQC Q.'));
  return { valid: errors.length === 0, errors };
}

export function assertValidDeepTimeRecord(record) {
  const result = validateDeepTimeRecord(record);
  if (!result.valid) throw new Error(`Invalid DEEPTime record:\n${result.errors.map(({ path, message }) => `${path}: ${message}`).join('\n')}`);
  return record;
}

export function validateDeepTimeWindow(records) {
  const errors = [];
  if (!Array.isArray(records) || records.length === 0) return { valid: false, errors: [error('$', 'At least one DEEPTime record is required.')] };
  records.forEach((record, index) => {
    const result = validateDeepTimeRecord(record);
    for (const item of result.errors) errors.push(error(`[${index}].${item.path}`, item.message));
  });
  const sequences = new Set(records.map((record) => `${record.sequence_id}@${record.sequence_revision}`));
  if (sequences.size > 1) errors.push(error('$', 'A DEEPTime window must remain inside one sequence revision.'));
  for (let index = 1; index < records.length; index += 1) {
    if (!(Number(records[index].lambda) > Number(records[index - 1].lambda))) errors.push(error(`[${index}].lambda`, 'Lambda must increase monotonically.'));
    if (!(Date.parse(records[index].time.utc) >= Date.parse(records[index - 1].time.utc))) errors.push(error(`[${index}].time.utc`, 'UTC time must not run backward.'));
  }
  return { valid: errors.length === 0, errors };
}

export { AXES as DEEP_TIME_PREMAQC_AXES };
