'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const mobius = require('./wayglass-mobius.cjs');
const { compile, execute, WyrdruneHardStop } = require('./wyrdrune/wyrdrune.cjs');
const { compileTyped } = require('./wyrdrune/typed-ir.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.wyrdrune-revision/v0.1';
const POLICY = compile(readFileSync(join(__dirname, 'wyrdrune', 'revision-selection.wtl'), 'utf8'));

function compileRevision(source) {
  const artifact = compileTyped(source);
  if (artifact.effects.required.length) throw new Error('Revision trials require pure typed programs');
  return artifact;
}

function evidence(result) {
  return { output: digest(result.output), execution: digest(result), phases: result.receipts.length };
}

function createWyrdruneRevisionLineage({
  initialSource, participant, currentSource = initialSource, checkpoints = [], expectedHead = null, signal,
} = {}) {
  if (typeof participant !== 'string' || !participant.trim() || participant.length > 180) {
    throw new TypeError('Revision lineage requires a participant reference');
  }
  const initial = compileRevision(initialSource);
  const seeds = { revision: initial.digest, generation: 0 };
  const options = { system: 'wyrdrune-revisions', name: POLICY.sourceHash, participant, seeds };
  const root = mobius.lineageRoot(options);
  if (!Array.isArray(checkpoints)) throw new TypeError('Revision checkpoints must be an array');
  const history = structuredClone(checkpoints);
  const previous = history.at(-1) ?? null;
  if (history.length || expectedHead !== null) {
    const verified = mobius.verifyChain(root, history);
    if (!previous || history[0].cycle !== 1 || !verified.ok || verified.head !== expectedHead ||
        history.some(checkpoint => checkpoint.status !== 'committed' || !checkpoint.spiral ||
          checkpoint.spiral_error)) {
      throw new Error('Revision Return refused: checkpoint chain does not match the trusted head');
    }
  }
  let active = currentSource === initialSource ? initial : compileRevision(currentSource);
  if (active.digest !== (previous?.carry ?? seeds).revision) {
    throw new Error('Revision Return refused: active source does not match the checkpoint');
  }
  const open = checkpoint => mobius.createLineage({
    ...options, previous: checkpoint, feather: () => Boolean(signal?.aborted),
  });
  let lineage = open(previous);
  let inFlight = false;

  async function runRevision(artifact) {
    const result = await execute(artifact.executable, { signal, maxOperations: 10000 });
    if (result.status && result.status !== 'committed') {
      throw new Error(result.verdict?.reason ?? 'Wyrdrune trial did not commit');
    }
    if (result.receipts.length !== artifact.executable.units.length * 8) {
      throw new Error('Wyrdrune trial did not finish every phase');
    }
    return evidence(result);
  }

  return Object.freeze({
    schema: SCHEMA,
    root,
    get activeRevision() { return active.digest; },
    get checkpoint() { return lineage.head; },
    async cycle({ source, parent, decision = 'defer', principal, approvalRef = null, expectedOutput } = {}) {
      if (inFlight) throw new Error('A revision trial is already in progress');
      if (parent !== active.digest) throw new Error('Revision parent is stale');
      if (principal?.authorized !== true || principal.id !== participant) {
        throw new Error('Revision trial requires verified participant authority');
      }
      if (!['defer', 'accept'].includes(decision)) throw new TypeError('Invalid revision decision');
      if (decision === 'accept' && (typeof approvalRef !== 'string' || !approvalRef.trim() || approvalRef.length > 240)) {
        throw new TypeError('Accepting a revision requires an approval reference');
      }
      if (expectedOutput !== undefined && !Array.isArray(expectedOutput)) {
        throw new TypeError('Expected revision output must be a WTL output list');
      }
      const declaredOutput = expectedOutput === undefined ? null : digest(expectedOutput);
      inFlight = true;
      const startingCheckpoint = lineage.head;
      let candidate, baseline, first, replay, selected, policy;
      async function trial(artifact) {
        try {
          return await runRevision(artifact);
        } catch (error) {
          if (signal?.aborted) throw new mobius.FeatherStop('during Wyrdrune trial');
          throw error;
        }
      }
      try {
        const cycle = await lineage.cycle({
          perceive: async ctx => {
            baseline = await trial(active);
            ctx.possibility('gathered', 1);
            return { parent, baseline };
          },
          compress: () => ({
            expectedOutput: declaredOutput ?? baseline.output,
            expectationSource: declaredOutput === null ? 'parent' : 'explicit',
            policySource: POLICY.sourceHash,
          }),
          release: async ctx => {
            candidate = compileRevision(source);
            first = await trial(candidate);
            replay = await trial(candidate);
            ctx.possibility('generated', 1);
            return { candidate: candidate.digest, first, replay };
          },
          verify: async (_ctx, outputs) => {
            try {
              policy = await execute(POLICY, {
                seeds: {
                  parent, candidate: candidate.digest, approved: decision === 'accept',
                  compatible: outputs.compress.expectedOutput === first.output, selfConsistent: first.execution === replay.execution,
                },
                signal, maxOperations: 100,
              });
            } catch (error) {
              if (signal?.aborted && error instanceof WyrdruneHardStop) {
                throw new mobius.FeatherStop('during Wyrdrune Verify');
              }
              throw error;
            }
            if (policy.status !== 'committed') return [{ ok: false, reason: policy.verdict?.reason }];
            selected = policy.output[0];
            const valid = policy.output.length === 1 && [parent, candidate.digest].includes(selected) &&
              policy.receipts.length === 8;
            return [{ ok: valid, reason: valid ? null : 'Invalid Wyrdrune selection receipt' }];
          },
          integrate: () => ({ policyExecution: digest(policy), evidence: digest({ baseline, first, replay }) }),
          choose: () => ({ decision, approvalRef: decision === 'accept' ? approvalRef : null, selected }),
          transcend: ctx => ({
            revision: selected,
            generation: ctx.carried.generation + Number(selected !== parent),
          }),
        });
        // Return stages no host effects. If Feather lands before carry, the
        // previous accepted checkpoint is still the only resumable revision.
        const checkpoint = cycle.status === 'committed' ? cycle.checkpoint : null;
        if (!checkpoint && lineage.head !== startingCheckpoint) lineage = open(startingCheckpoint);
        const changed = checkpoint !== null && checkpoint.carry.revision !== parent;
        if (changed) active = candidate;
        return Object.freeze({
          ...cycle,
          schema: SCHEMA,
          changed, parent,
          candidate: candidate?.digest ?? null, activeRevision: active.digest,
          policySource: POLICY.sourceHash, policyReceipts: policy?.receipts ?? [],
          checkpoint,
          checkpointDigest: checkpoint ? digest(checkpoint) : null,
        });
      } finally {
        inFlight = false;
      }
    },
  });
}

module.exports = { createWyrdruneRevisionLineage };
