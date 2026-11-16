'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { compile, execute, isUnknown } = require('./wyrdrune/wyrdrune.cjs');
const { compileTyped } = require('./wyrdrune/typed-ir.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const read = name => readFileSync(join(__dirname, 'wyrdrune', name), 'utf8');
const VERIFY = compile(read('engine-verify.wtl'));
const TURN_SOURCE = read('engine-turn.wtl');

async function verifyEngine(evidence, { signal } = {}) {
  const evidenceDigest = digest(evidence);
  const verdicts = evidence.verdicts;
  const result = await execute(VERIFY, {
    seeds: {
      evidenceDigest,
      evidenceCount: verdicts.length,
      refusalCount: verdicts.filter(item => item.ok !== true).length,
    },
    signal,
    maxOperations: 100,
  });
  return Object.freeze({
    schema: 'wayglass.wyrdrune-engine-verification/v0.1',
    sourceHash: VERIFY.sourceHash,
    evidenceDigest,
    executionDigest: digest(result),
    status: result.status,
    accepted: result.status === 'committed' && result.output.length === 1 && result.output[0] === evidenceDigest,
    reason: result.verdict?.reason ?? null,
  });
}

function matchesType(value, type) {
  switch (type) {
    case 'number': return Number.isFinite(value);
    case 'text': return typeof value === 'string';
    case 'truth': return typeof value === 'boolean';
    case 'unknown': return isUnknown(value);
    case 'list': return Array.isArray(value);
    case 'record': return value !== null && typeof value === 'object' && !Array.isArray(value) && !isUnknown(value);
    case 'null': return value === null;
    case 'data': return true; // Möbius already requires canonical data at admission.
    default: return false;
  }
}

function createWyrdruneProjection(filename, seedTypes = {}) {
  const compiled = compileTyped(read(filename), { seedTypes });
  if (compiled.effects.required.length) throw new TypeError('Engine projections require pure WTL');
  return async (seeds = {}) => {
    for (const [name, type] of Object.entries(compiled.seedTypes ?? {})) {
      if (!Object.hasOwn(seeds, name) || !matchesType(seeds[name], type)) {
        throw new TypeError('Engine projection seed type mismatch: ' + name);
      }
    }
    const result = await execute(compiled.executable, { seeds, maxOperations: 1000 });
    if (result.status !== 'committed' || result.receipts.length !== 8 || result.output.length !== 1) {
      throw new Error(result.verdict?.reason ?? 'Engine projection did not return one result');
    }
    return {
      output: result.output[0],
      receipt: Object.freeze({
        sourceHash: compiled.sourceHash,
        inputDigest: digest(seeds),
        outputDigest: digest(result.output[0]),
        executionDigest: digest(result),
      }),
    };
  };
}

function createWyrdruneEnginePhases(source = TURN_SOURCE, {
  signal, maxOperations = 10000, seedTypes = source === TURN_SOURCE ? { n: 'number' } : {},
} = {}) {
  const artifact = compileTyped(source, { seedTypes });
  if (artifact.effects.required.length) throw new TypeError('Möbius engine programs must have no host effects');
  if (artifact.executable.units.length !== 1 || artifact.executable.units[0].scope !== 'carried') {
    throw new TypeError('Möbius engine programs require one scoped circuit');
  }
  return Object.freeze({
    perceive: ctx => ({ sourceHash: artifact.sourceHash, carryDigest: digest(ctx.carried) }),
    compress: (_ctx, outputs) => outputs.perceive,
    release: async ctx => {
      for (const [name, type] of Object.entries(artifact.seedTypes ?? {})) {
        if (!Object.hasOwn(ctx.carried, name) || !matchesType(ctx.carried[name], type)) {
          throw new TypeError('Möbius engine seed type mismatch: ' + name);
        }
      }
      const result = await execute(artifact.executable, { seeds: ctx.carried, signal, maxOperations });
      const carry = result.continuity.carry;
      if (result.status === 'committed') {
        for (const [name, type] of Object.entries(artifact.seedTypes ?? {})) {
          if (!Object.hasOwn(carry, name) || !matchesType(carry[name], type)) {
            throw new TypeError('Möbius engine carry type mismatch: ' + name);
          }
        }
      }
      return {
        status: result.status, reason: result.verdict?.reason ?? null,
        sourceHash: artifact.sourceHash, executionDigest: digest(result), phases: result.receipts,
        carry, output: result.output,
      };
    },
    verify: (_ctx, outputs) => [{
      ok: outputs.release.status === 'committed',
      reason: outputs.release.reason,
    }],
    integrate: (_ctx, outputs) => ({
      executionDigest: outputs.release.executionDigest, outputs: outputs.release.output,
    }),
    choose: (_ctx, outputs) => ({ carryDigest: digest(outputs.release.carry) }),
    transcend: (_ctx, outputs) => outputs.release.carry,
  });
}

module.exports = { verifyEngine, createWyrdruneEnginePhases, createWyrdruneProjection };
