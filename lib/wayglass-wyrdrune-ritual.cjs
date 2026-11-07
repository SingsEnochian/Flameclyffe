'use strict';
// Wayglass's pure ritual-preview crossing. No routes, provider access,
// file writes, external bridges, identity assertions or canon commits.
const { compile, execute } = require('./wyrdrune/wyrdrune.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

async function previewWyrdruneRitual(source, { signal = null, maxOperations = 10000 } = {}) {
  const ir = compile(source);
  // Deliberately do not accept a principal or bridge map from the caller.
  const execution = await execute(ir, {
    bridges: Object.freeze({}),
    principal: null,
    signal,
    maxOperations,
  });
  const record = {
    schema: 'wayglass.wyrdrune-ritual-preview/v0.1',
    status: 'preview-only',
    sourceHash: ir.sourceHash,
    effectPolicy: 'no-host-effects',
    executionSchema: execution.schema,
    values: execution.output,
    phaseReceipts: execution.receipts,
    withness: execution.withness,
  };
  return Object.freeze({ ...record, receiptHash: digest(record) });
}

module.exports = { previewWyrdruneRitual };
