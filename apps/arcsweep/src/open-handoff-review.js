export const OPEN_HANDOFF_REVIEW_SCHEMA = 'arcsweep.open-handoffs-review/v1';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function auditOpenHandoffReview(review = {}) {
  const violations = [];
  const warnings = [];

  if (review.schema !== OPEN_HANDOFF_REVIEW_SCHEMA) {
    violations.push({ code: 'handoff.schema', message: 'Unexpected open-handoff review schema.' });
  }

  if (review.rules?.silence_is_acknowledgement !== false) {
    violations.push({ code: 'handoff.silence-ack', message: 'Silence must never count as acknowledgement.' });
  }

  if (review.rules?.infer_owner !== false) {
    violations.push({ code: 'handoff.infer-owner', message: 'Owner inference must remain disabled.' });
  }

  if (review.rules?.allow_system_owner !== false) {
    violations.push({ code: 'handoff.system-owner-rule', message: 'The system may not be a handoff owner.' });
  }

  const handoffs = Array.isArray(review.handoffs) ? review.handoffs : [];
  for (const [index, item] of handoffs.entries()) {
    const ref = text(item?.source_receipt) || `handoff[${index}]`;
    if (!text(item?.handoff)) {
      violations.push({ code: 'handoff.summary-missing', ref, message: 'Handoff summary is required.' });
    }
    if (!text(item?.acknowledgement_status)) {
      violations.push({ code: 'handoff.ack-status-missing', ref, message: 'Acknowledgement status is required.' });
    }

    const owner = item?.next_owner;
    if (!owner) {
      warnings.push({ code: 'handoff.owner-missing', ref, message: 'Explicit next_owner is missing.' });
      continue;
    }

    if (!['agent', 'human'].includes(owner.kind)) {
      violations.push({ code: 'handoff.owner-kind', ref, message: 'next_owner.kind must be agent or human.' });
    }
    if (!text(owner.id) || !text(owner.display_name)) {
      violations.push({ code: 'handoff.owner-name', ref, message: 'next_owner must have id and display_name.' });
    }
    if (/^(system|the-system)$/i.test(text(owner.id)) || /^the system$/i.test(text(owner.display_name))) {
      violations.push({ code: 'handoff.system-owner', ref, message: 'The system cannot be a named next_owner.' });
    }
  }

  return Object.freeze({
    schema: 'arcsweep.open-handoffs-audit/v1',
    pass: violations.length === 0,
    handoff_count: handoffs.length,
    missing_owner_count: warnings.filter((entry) => entry.code === 'handoff.owner-missing').length,
    violations: Object.freeze(violations),
    warnings: Object.freeze(warnings),
  });
}
