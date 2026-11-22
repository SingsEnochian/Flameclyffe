'use strict';

// Classify preview outcomes without treating unsupported inquiry as a safety verdict.
// Technical errors and participant stops are distinct; unknown errors remain unknown.
function classifyPreviewOutcome(error) {
  const detail = String(error?.message || 'Preview could not be completed');
  const invalid = error instanceof SyntaxError || error instanceof TypeError ||
    error instanceof RangeError || error instanceof ReferenceError ||
    /Bridge capability unavailable|Feather|operation budget|Duplicate binding|Unknown binding/.test(detail);
  const reason = /Feather/i.test(detail) ? 'participant_stop'
    : /Bridge capability unavailable/i.test(detail) ? 'capability_unavailable'
    : /operation budget/i.test(detail) ? 'resource_limit'
    : invalid ? 'invalid_or_unsupported_wtl' : 'preview_execution_failed';
  return { invalid, reason, detail };
}

module.exports = { classifyPreviewOutcome };
