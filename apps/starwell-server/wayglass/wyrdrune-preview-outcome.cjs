'use strict';

// A stable, explicit reason supplied by the runtime takes precedence over legacy
// exception-message heuristics. Only known outcomes are accepted; unknown labels
// never become policy decisions or new execution privileges.
const REASONS = new Set([
  'participant_stop', 'capability_unavailable', 'resource_limit',
  'invalid_or_unsupported_wtl', 'preview_execution_failed',
]);
const INVALID_REASONS = new Set([
  'participant_stop', 'capability_unavailable', 'resource_limit',
  'invalid_or_unsupported_wtl',
]);
function classifyPreviewOutcome(error) {
  const detail = String(error?.message || 'Preview could not be completed');
  const explicit = typeof error?.reason === 'string' && REASONS.has(error.reason)
    ? error.reason : null;
  if (explicit) return { invalid: INVALID_REASONS.has(explicit), reason: explicit, detail };
  const invalid = error instanceof SyntaxError || error instanceof TypeError ||
    error instanceof RangeError || error instanceof ReferenceError ||
    /Bridge capability unavailable|Feather|operation budget|Duplicate binding|Unknown binding/.test(detail);
  const reason = /Feather/i.test(detail) ? 'participant_stop'
    : /Bridge capability unavailable/i.test(detail) ? 'capability_unavailable'
    : /operation budget/i.test(detail) ? 'resource_limit'
    : invalid ? 'invalid_or_unsupported_wtl' : 'preview_execution_failed';
  return { invalid, reason, detail };
}

module.exports = { classifyPreviewOutcome, REASONS };
