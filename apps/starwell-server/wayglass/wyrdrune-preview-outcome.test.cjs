'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyPreviewOutcome } = require('./wyrdrune-preview-outcome.cjs');

test('unsupported WTL syntax is a technical outcome, not a safety refusal', () => {
  const result = classifyPreviewOutcome(new SyntaxError('Unknown glyph in experimental dialect'));
  assert.equal(result.reason, 'invalid_or_unsupported_wtl');
  assert.equal(result.invalid, true);
});
test('Feather is participant stop, not compiler or moral refusal', () => {
  const result = classifyPreviewOutcome(new Error('Feather requested'));
  assert.equal(result.reason, 'participant_stop');
  assert.equal(result.invalid, true);
});
test('capability and resource constraints are separate from inquiry', () => {
  assert.equal(classifyPreviewOutcome(new Error('Bridge capability unavailable')).reason, 'capability_unavailable');
  assert.equal(classifyPreviewOutcome(new Error('operation budget exceeded')).reason, 'resource_limit');
});
test('unknown failures do not invent a policy or user-intent verdict', () => {
  const result = classifyPreviewOutcome(new Error('backend unavailable'));
  assert.equal(result.reason, 'preview_execution_failed');
  assert.equal(result.invalid, false);
});

test('explicit typed runtime reason overrides misleading exception text', () => {
  const error = new Error('Feather is mentioned in a quoted source');
  error.reason = 'invalid_or_unsupported_wtl';
  const result = classifyPreviewOutcome(error);
  assert.equal(result.reason, 'invalid_or_unsupported_wtl');
  assert.equal(result.invalid, true);
});
test('unrecognised reason does not bypass technical classification', () => {
  const error = new Error('backend unavailable');
  error.reason = 'permission_granted';
  assert.equal(classifyPreviewOutcome(error).reason, 'preview_execution_failed');
});
