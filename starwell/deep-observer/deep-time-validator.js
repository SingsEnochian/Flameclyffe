const PREMAQ_AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
const EPISTEMIC_STATUSES = new Set(['KNOWN', 'BOUNDED', 'SYMBOLIC', 'UNKNOWN']);

function error(path, message) {
  return { path, message };
}

export function validateDeepTimeRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, errors: [error('$', 'Record must be an object.')] };
  }

  if (record.dataset_kind !== 'deep_time') {
    errors.push(error('dataset_kind', 'Expected dataset_kind to equal deep_time.'));
  }

  if (!record.sequence_id || typeof record.sequence_id !== 'string' || record.sequence_id.length === 0) {
    errors.push(error('sequence_id', 'sequence_id must be a non-empty string.'));
  }

  if (!record.time_anchors || typeof record.time_anchors.utc_start !== 'string') {
    errors.push(error('time_anchors.utc_start', 'time_anchors must include a utc_start timestamp.'));
  }

  const declaredSources = new Set();
  if (!Array.isArray(record.source_refs) || record.source_refs.length === 0) {
    errors.push(error('source_refs', 'At least one source reference is required.'));
  } else {
    record.source_refs.forEach((source, index) => {
      const ref = source?.ref;
      if (typeof ref !== 'string' || ref.length === 0) {
        errors.push(error(`source_refs[${index}].ref`, 'Source ref must be a non-empty string.'));
        return;
      }
      if (declaredSources.has(ref)) {
        errors.push(error(`source_refs[${index}].ref`, `Duplicate source ref: ${ref}.`));
      }
      declaredSources.add(ref);
    });
  }

  if (!Array.isArray(record.snapshots) || record.snapshots.length === 0) {
    errors.push(error('snapshots', 'At least one temporal snapshot is required.'));
  } else {
    let lastStep = -1;
    let lastRadius = -Infinity;

    record.snapshots.forEach((snap, index) => {
      const snapPath = `snapshots[${index}]`;

      if (typeof snap?.step !== 'number' || !Number.isInteger(snap.step) || snap.step < 0) {
        errors.push(error(`${snapPath}.step`, 'step must be a non-negative integer.'));
      } else if (snap.step <= lastStep) {
        errors.push(error(`${snapPath}.step`, `step must be monotonically increasing. Got ${snap.step} after ${lastStep}.`));
      } else {
        lastStep = snap.step;
      }

      if (typeof snap?.temporal_coordinate !== 'number') {
        errors.push(error(`${snapPath}.temporal_coordinate`, 'temporal_coordinate must be a number.'));
      }

      if (!snap?.source_ref || typeof snap.source_ref !== 'string' || snap.source_ref.length === 0) {
        errors.push(error(`${snapPath}.source_ref`, 'Every snapshot must reference a declared source.'));
      } else if (!declaredSources.has(snap.source_ref)) {
        errors.push(error(`${snapPath}.source_ref`, `Unknown source ref: ${snap.source_ref}.`));
      }

      const premaq = snap?.premaq_state;
      if (!premaq || typeof premaq !== 'object') {
        errors.push(error(`${snapPath}.premaq_state`, 'premaq_state must be an object.'));
      } else {
        for (const axis of PREMAQ_AXES) {
          if (!(axis in premaq)) {
            errors.push(error(`${snapPath}.premaq_state.${axis}`, `Axis ${axis} is required in every snapshot.`));
            continue;
          }
          const axisVal = premaq[axis];
          if (!EPISTEMIC_STATUSES.has(axisVal?.epistemic_status)) {
            errors.push(error(
              `${snapPath}.premaq_state.${axis}.epistemic_status`,
              `epistemic_status must be one of KNOWN, BOUNDED, SYMBOLIC, UNKNOWN.`
            ));
          }
          if (axisVal?.epistemic_status === 'KNOWN' && axisVal.value === null) {
            errors.push(error(
              `${snapPath}.premaq_state.${axis}.value`,
              'KNOWN axis must carry a non-null value.'
            ));
          }
          if (axisVal?.epistemic_status === 'UNKNOWN' && axisVal.value !== null && axisVal.value !== undefined) {
            errors.push(error(
              `${snapPath}.premaq_state.${axis}.value`,
              'UNKNOWN axis must carry a null value.'
            ));
          }
          if (typeof axisVal?.value === 'number' && (axisVal.value < 0 || axisVal.value > 1)) {
            errors.push(error(
              `${snapPath}.premaq_state.${axis}.value`,
              `Axis value must be in [0, 1]. Got ${axisVal.value}.`
            ));
          }
        }
      }

      const mask = snap?.acceptance_mask;
      if (!mask || typeof mask !== 'object') {
        errors.push(error(`${snapPath}.acceptance_mask`, 'acceptance_mask must be an object.'));
      } else {
        for (const axis of PREMAQ_AXES) {
          if (typeof mask[axis] !== 'boolean') {
            errors.push(error(`${snapPath}.acceptance_mask.${axis}`, `acceptance_mask.${axis} must be a boolean.`));
          }
        }
      }

      const spiral = snap?.spiral;
      if (!spiral || typeof spiral !== 'object') {
        errors.push(error(`${snapPath}.spiral`, 'spiral must be an object.'));
      } else {
        if (typeof spiral.cycle !== 'number' || !Number.isInteger(spiral.cycle) || spiral.cycle < 0) {
          errors.push(error(`${snapPath}.spiral.cycle`, 'spiral.cycle must be a non-negative integer.'));
        }
        if (typeof spiral.radius !== 'number' || spiral.radius < 0) {
          errors.push(error(`${snapPath}.spiral.radius`, 'spiral.radius must be a non-negative number.'));
        } else if (spiral.radius < lastRadius - 1e-9) {
          errors.push(error(`${snapPath}.spiral.radius`, `spiral.radius must not decrease. Got ${spiral.radius} after ${lastRadius}.`));
        } else {
          lastRadius = spiral.radius;
        }
        if (typeof spiral.angle !== 'number' || spiral.angle < 0) {
          errors.push(error(`${snapPath}.spiral.angle`, 'spiral.angle must be a non-negative number.'));
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidDeepTimeRecord(record) {
  const result = validateDeepTimeRecord(record);
  if (!result.valid) {
    const detail = result.errors.map(({ path, message }) => `${path}: ${message}`).join('\n');
    throw new Error(`Invalid DEEPTime record:\n${detail}`);
  }
  return record;
}
