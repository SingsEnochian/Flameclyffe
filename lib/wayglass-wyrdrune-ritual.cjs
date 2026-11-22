'use strict';
// Wayglass's pure ritual-preview crossing. No routes, provider access,
// file writes, external bridges, identity assertions or canon commits.
const { compile, execute, inspectOperators } = require('./wyrdrune/wyrdrune.cjs');
const { compileTyped } = require('./wyrdrune/typed-ir.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');
const { buildRitualLedger } = require('./wyrdrune/ritual-ledger.cjs');

function checkPreviewFeather(signal) {
  if (signal?.aborted) {
    const error = new Error('Feather: preview stopped');
    error.reason = 'participant_stop';
    throw error;
  }
}

async function previewWyrdruneRitual(source, { signal = null, maxOperations = 10000, checkOperators = false, typed = false } = {}) {
  checkPreviewFeather(signal);
  const ir = typed ? compileTypedPreview(source) : compile(source);
  if (checkOperators) {
    const inspection = inspectOperators(ir);
    if (inspection.diagnostics.length) {
      const error = new SyntaxError('WTL operator preflight found invalid references');
      error.reason = 'invalid_or_unsupported_wtl';
      error.diagnostics = inspection.diagnostics;
      throw error;
    }
  }
  checkPreviewFeather(signal);
  // Deliberately do not accept a principal or bridge map from the caller.
  const execution = await execute(ir, {
    bridges: Object.freeze({}),
    principal: null,
    signal,
    maxOperations,
  });
  checkPreviewFeather(signal);
  const record = {
    schema: 'wayglass.wyrdrune-ritual-preview/v0.1',
    status: 'preview-only',
    sourceHash: ir.sourceHash,
    effectPolicy: 'no-host-effects',
    executionSchema: execution.schema,
    values: execution.output,
    phaseReceipts: execution.receipts,
    withness: execution.withness,
    ritualLedger: buildRitualLedger(execution),
  };
  const receiptHash = digest(record);
  checkPreviewFeather(signal);
  return Object.freeze({ ...record, receiptHash });
}

function compileTypedPreview(source) {
  const artifact = compileTyped(source);
  if (artifact.effects.required.length) {
    const error = new SyntaxError('WTL typed preview requires a program with no host effects');
    error.reason = 'capability_unavailable';
    error.effects = artifact.effects;
    throw error;
  }
  return artifact.executable;
}

module.exports = { previewWyrdruneRitual, compileTyped };
