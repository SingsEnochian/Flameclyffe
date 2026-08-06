const VALID_EPISTEMIC_STATUSES = new Set(['established', 'active_research', 'speculative', 'symbolic', 'unknown']);
const VALID_FINDING_KINDS = new Set(['correlation', 'recurrence', 'threshold', 'trajectory', 'structural', 'anomaly', 'calibration', 'contradiction']);

function error(path, message) {
  return { path, message };
}

export function validateDeepTheoryRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, errors: [error('$', 'Record must be an object.')] };
  }

  if (record.dataset_kind !== 'deep_theory') {
    errors.push(error('dataset_kind', 'Expected dataset_kind to equal deep_theory.'));
  }

  if (!record.title || typeof record.title !== 'string' || record.title.length === 0) {
    errors.push(error('title', 'title must be a non-empty string.'));
  }

  if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
    errors.push(error('confidence', 'confidence must be a number in [0, 1].'));
  }

  if (!VALID_EPISTEMIC_STATUSES.has(record.epistemic_status)) {
    errors.push(error('epistemic_status', `epistemic_status must be one of: ${[...VALID_EPISTEMIC_STATUSES].join(', ')}.`));
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

  if (!Array.isArray(record.findings) || record.findings.length === 0) {
    errors.push(error('findings', 'At least one finding is required.'));
  } else {
    const seenFindingIds = new Set();
    record.findings.forEach((finding, index) => {
      const path = `findings[${index}]`;

      if (!finding?.finding_id || typeof finding.finding_id !== 'string' || finding.finding_id.length === 0) {
        errors.push(error(`${path}.finding_id`, 'finding_id must be a non-empty string.'));
      } else if (seenFindingIds.has(finding.finding_id)) {
        errors.push(error(`${path}.finding_id`, `Duplicate finding_id: ${finding.finding_id}.`));
      } else {
        seenFindingIds.add(finding.finding_id);
      }

      if (!finding?.text || typeof finding.text !== 'string' || finding.text.length === 0) {
        errors.push(error(`${path}.text`, 'Finding text must be a non-empty string.'));
      }

      if (!VALID_FINDING_KINDS.has(finding?.finding_kind)) {
        errors.push(error(`${path}.finding_kind`, `finding_kind must be one of: ${[...VALID_FINDING_KINDS].join(', ')}.`));
      }

      if (!VALID_EPISTEMIC_STATUSES.has(finding?.epistemic_status)) {
        errors.push(error(`${path}.epistemic_status`, 'Every finding must declare an epistemic_status.'));
      }

      if (typeof finding?.confidence !== 'number' || finding.confidence < 0 || finding.confidence > 1) {
        errors.push(error(`${path}.confidence`, 'Every finding must declare confidence in [0, 1].'));
      }

      if (!Array.isArray(finding?.source_refs) || finding.source_refs.length === 0) {
        errors.push(error(`${path}.source_refs`, 'Every finding must reference at least one declared source.'));
      } else {
        finding.source_refs.forEach((ref, refIndex) => {
          if (!declaredSources.has(ref)) {
            errors.push(error(`${path}.source_refs[${refIndex}]`, `Unknown source ref: ${ref}.`));
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidDeepTheoryRecord(record) {
  const result = validateDeepTheoryRecord(record);
  if (!result.valid) {
    const detail = result.errors.map(({ path, message }) => `${path}: ${message}`).join('\n');
    throw new Error(`Invalid DEEPTheory record:\n${detail}`);
  }
  return record;
}
