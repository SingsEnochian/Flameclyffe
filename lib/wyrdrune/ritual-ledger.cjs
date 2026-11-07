'use strict';
// Pure, content-addressed evidence for the CURRENT WTL v0.1 interpreter.
// This is a tamper-evident sequence, NOT a signature, oracle, canon decision,
// staged-effect commit protocol or claim of full WIR v0.2 semantics.
const { digest, encode } = require('./canonical.cjs');
const { PHASES } = require('./wyrdrune.cjs');

const ROOT_SCHEMA = 'wyrdrune.ritual-ledger-root/v0.1';
const STEP_SCHEMA = 'wyrdrune.ritual-ledger-step/v0.1';
const LEDGER_SCHEMA = 'wyrdrune.ritual-ledger/v0.1';

function buildRitualLedger(execution) {
  if (execution?.schema !== 'wyrdrune.execution/v0.1' ||
      !/^[0-9a-f]{64}$/.test(execution.sourceHash || '') ||
      !Array.isArray(execution.receipts) || !Array.isArray(execution.output) ||
      !execution.receipts.length || execution.receipts.length % 8 !== 0) {
    throw new TypeError('Invalid Eightfold execution for ritual ledger');
  }
  const root = digest({
    schema: ROOT_SCHEMA,
    sourceHash: execution.sourceHash,
    cycleCount: execution.receipts.length / 8,
    outputCount: execution.output.length,
  });
  let previousHash = root, emitted = 0, operations = -1;
  const entries = execution.receipts.map((receipt, index) => {
    const cycle = Math.floor(index / 8) + 1;
    const phaseIndex = index % 8;
    if (receipt?.phase !== PHASES[phaseIndex] ||
        receipt.sourceHash !== execution.sourceHash ||
        !Number.isSafeInteger(receipt.emitted) || receipt.emitted < 0 ||
        !Number.isSafeInteger(receipt.operations) || receipt.operations <= operations ||
        emitted + receipt.emitted > execution.output.length) {
      throw new TypeError('Invalid phase order, emitted values or operation counts in ritual ledger');
    }
    const emissionHashes = execution.output.slice(emitted, emitted + receipt.emitted).map(digest);
    emitted += receipt.emitted;
    operations = receipt.operations;
    const record = {
      schema: STEP_SCHEMA,
      cycle,
      face: cycle % 2 === 1 ? 'outer' : 'inner',
      phaseIndex: phaseIndex + 1,
      phase: receipt.phase,
      sourceHash: execution.sourceHash,
      emitted: receipt.emitted,
      operations: receipt.operations,
      emissionHashes,
      previousHash,
    };
    const entryHash = digest(record);
    previousHash = entryHash;
    return Object.freeze({ ...record, entryHash });
  });
  if (emitted !== execution.output.length ||
      execution.withness?.completedCycles !== execution.receipts.length / 8) {
    throw new TypeError('Unaccounted ritual outputs or cycle count');
  }
  return Object.freeze({
    schema: LEDGER_SCHEMA,
    root,
    sourceHash: execution.sourceHash,
    cycles: execution.receipts.length / 8,
    entries: Object.freeze(entries),
    terminalHash: previousHash,
    assurance: 'content-integrity-only; not signer-authenticated or ritual canon',
  });
}

function verifyRitualLedger(execution, ledger) {
  try {
    if (!ledger || ledger.schema !== LEDGER_SCHEMA) return false;
    return encode(buildRitualLedger(execution)) === encode(ledger);
  } catch (_error) {
    return false;
  }
}

module.exports = { buildRitualLedger, verifyRitualLedger };
