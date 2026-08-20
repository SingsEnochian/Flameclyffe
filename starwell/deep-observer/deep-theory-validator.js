const THEORY_KINDS = new Set(['correlation', 'topology_model', 'transition_model', 'temporal_pattern', 'hypothesis', 'comparison', 'other']);
const STATUSES = new Set(['candidate', 'reviewed', 'accepted', 'superseded', 'retired']);
const CALIBRATION_STATES = new Set(['normal-form-only', 'model-calibrated', 'domain-calibrated']);

function error(path, message) {
  return { path, message };
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateControlSemantic(semantic, path, key, errors) {
  if (!semantic || typeof semantic !== 'object' || Array.isArray(semantic)) {
    errors.push(error(path, 'Control semantic must be an object.'));
    return;
  }
  if (semantic.key !== key) errors.push(error(`${path}.key`, `Control semantic key must equal ${key}.`));
  if (!nonEmpty(semantic.role)) errors.push(error(`${path}.role`, 'Control role is required.'));
  if (!nonEmpty(semantic.label)) errors.push(error(`${path}.label`, 'Control label is required.'));
  if (!nonEmpty(semantic.source)) errors.push(error(`${path}.source`, 'Control semantic source is required.'));
  if (typeof semantic.intentional !== 'boolean') errors.push(error(`${path}.intentional`, 'Control intentionality must be explicitly boolean.'));
}

export function validateDeepTheoryRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, errors: [error('$', 'Record must be an object.')] };
  }

  if (record.dataset_kind !== 'deep_theory') errors.push(error('dataset_kind', 'Expected dataset_kind to equal deep_theory.'));
  if (record.schema_version !== '0.1.0') errors.push(error('schema_version', 'Expected schema_version 0.1.0.'));
  if (!nonEmpty(record.id)) errors.push(error('id', 'Record id is required.'));
  if (!nonEmpty(record.title)) errors.push(error('title', 'Title is required.'));
  if (!nonEmpty(record.domain)) errors.push(error('domain', 'Domain is required.'));
  if (!THEORY_KINDS.has(record.theory_kind)) errors.push(error('theory_kind', 'Unknown DEEPTheory theory_kind.'));
  if (!STATUSES.has(record.status)) errors.push(error('status', 'Unknown DEEPTheory status.'));

  const declaredSources = new Set();
  if (!Array.isArray(record.source_refs) || record.source_refs.length === 0) {
    errors.push(error('source_refs', 'At least one source reference is required.'));
  } else {
    record.source_refs.forEach((source, index) => {
      const ref = source?.ref;
      if (!nonEmpty(ref)) {
        errors.push(error(`source_refs[${index}].ref`, 'Source ref must be a non-empty string.'));
        return;
      }
      if (declaredSources.has(ref)) errors.push(error(`source_refs[${index}].ref`, `Duplicate source ref: ${ref}.`));
      declaredSources.add(ref);
    });
  }

  if (!Array.isArray(record.models) || record.models.length === 0) {
    errors.push(error('models', 'At least one analytical model is required.'));
  } else {
    record.models.forEach((model, index) => {
      const path = `models[${index}]`;
      if (!nonEmpty(model?.id)) errors.push(error(`${path}.id`, 'Model id is required.'));
      if (!nonEmpty(model?.equation)) errors.push(error(`${path}.equation`, 'Model equation is required.'));
      if (!CALIBRATION_STATES.has(model?.calibration_state)) errors.push(error(`${path}.calibration_state`, 'Unknown calibration state.'));
      validateControlSemantic(model?.control_semantics?.a, `${path}.control_semantics.a`, 'a', errors);
      validateControlSemantic(model?.control_semantics?.b, `${path}.control_semantics.b`, 'b', errors);
      if (typeof model?.physical_claim !== 'boolean') errors.push(error(`${path}.physical_claim`, 'Model physical_claim must be explicitly boolean.'));
    });
  }

  if (!Array.isArray(record.findings) || record.findings.length === 0) {
    errors.push(error('findings', 'At least one finding is required.'));
  } else {
    record.findings.forEach((finding, index) => {
      const path = `findings[${index}]`;
      if (!nonEmpty(finding?.id)) errors.push(error(`${path}.id`, 'Finding id is required.'));
      if (!nonEmpty(finding?.text)) errors.push(error(`${path}.text`, 'Finding text is required.'));
      if (!Array.isArray(finding?.source_refs) || finding.source_refs.length === 0) {
        errors.push(error(`${path}.source_refs`, 'Every finding must cite at least one declared source.'));
      } else {
        finding.source_refs.forEach((sourceRef, sourceIndex) => {
          if (!declaredSources.has(sourceRef)) errors.push(error(`${path}.source_refs[${sourceIndex}]`, `Unknown source ref: ${sourceRef}.`));
        });
      }
    });
  }

  if (record.source_integrity?.raw_sources_immutable !== true) errors.push(error('source_integrity.raw_sources_immutable', 'Raw sources must remain immutable.'));
  if (record.source_integrity?.analyses_append_only !== true) errors.push(error('source_integrity.analyses_append_only', 'Analyses must be append-only.'));
  if (record.source_integrity?.silent_canonicalisation_forbidden !== true) errors.push(error('source_integrity.silent_canonicalisation_forbidden', 'Silent canonicalisation must be forbidden.'));

  if (record.status === 'candidate' && record.review?.human_review_required !== true) {
    errors.push(error('review.human_review_required', 'Candidate theory records require human review.'));
  }
  if (record.authority?.domain_semantics_explicit !== true) errors.push(error('authority.domain_semantics_explicit', 'Domain semantics must be explicit.'));
  if (record.authority?.cross_domain_numeric_equivalence_assumed !== false) errors.push(error('authority.cross_domain_numeric_equivalence_assumed', 'Cross-domain numeric equivalence must not be assumed.'));
  if (record.status === 'candidate' && record.authority?.canon_commit !== false) errors.push(error('authority.canon_commit', 'Candidate records cannot commit canon.'));

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
