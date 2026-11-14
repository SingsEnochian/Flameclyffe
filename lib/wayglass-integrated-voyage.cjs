'use strict';

// One ship, shared Eightfold. Wyrdrune owns all relational/candidate maths.
// Host wiring coordinates existing engines and attributes their evidence.
// No model invocation, live device effect, identity mutation or auto-approval.
const { digest } = require('./wyrdrune/canonical.cjs');
const { executeTensorIR } = require('./wyrdrune/tensor-engine.cjs');
const { createCoEvolution } = require('./wayglass-coevolution.cjs');
const { proposeCrossing } = require('./wayglass-mythience-crossing.cjs');
const { createAutopoieticRuntime } = require('./wayglass-autopoietic-runtime.cjs');
const { runQuadEightfold, TABLES, SOURCE_SCHEMA } = require('./wayglass-quad-eightfold.cjs');
const { createWayglassDeparture } = require('./wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('./wayglass-return-trial.cjs');

const SCHEMA = 'wayglass.integrated-voyage/v0.1';
const TENSOR_PROGRAM = Object.freeze({
  schema: 'wyrdrune.tensor-ir/v0.1',
  inputs: [
    { id: 'baseline', shape: [3], dtype: 'f64' },
    { id: 'candidate', shape: [3], dtype: 'f64' },
  ],
  nodes: [{ id: 'change', op: 'sub', args: ['baseline', 'candidate'] }],
  outputs: ['change'],
});
function required(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new TypeError(name + ' must be a bounded nonempty string');
  }
  return value.trim();
}
function unavailableSources(at) {
  return {
    schema: SOURCE_SCHEMA,
    observed_at: at,
    channels: TABLES.map(id => ({
      id, status: 'unavailable', count: null, latest_at: null,
      provenance: 'no-authorised-observer-adapter-in-this-run',
    })),
  };
}
function tensorDiagnostics(base, candidate, signal) {
  const result = executeTensorIR(TENSOR_PROGRAM, {
    baseline: [base.network.p95_ms, base.network.error_rate, base.intelligence.success_rate],
    candidate: [candidate.network.p95_ms, candidate.network.error_rate, candidate.intelligence.success_rate],
  }, { signal, maxOperations: 1000 });
  return Object.freeze({
    schema: result.schema,
    program_fingerprint: result.programFingerprint,
    input_fingerprint: result.feedsDigest,
    backend: result.execution.backend,
    gpu_executed: result.execution.gpuExecuted,
    metrics: ['baseline_minus_candidate_p95_ms', 'baseline_minus_candidate_network_error_rate',
      'baseline_minus_candidate_intelligence_success_rate'],
    delta: result.outputs.change.values,
  });
}

/**
 * A single synthetic or caller-sourced voyage runs four existing engines.
 * The autopoietic runtime manages the ONE declared participant; infrastructure
 * and intelligence remain separately identified subsystems, not fake people.
 * If any native WTL proposal fails Verify, the ship lineage rolls back.
 * Integration always asks the co-evolution engine for a proposal only. A
 * separately approved sandbox carry remains the responsibility of that engine.
 */
async function runIntegratedVoyage({
  principal, world_id, identity_declarations,
  coevolution, mythience, observer = null, recorded_at = new Date().toISOString(),
  feather = () => false, stop_point = 'Review the integrated proposal and return.',
  next_owner,
} = {}) {
  if (!principal || principal.authorized !== true ||
      !principal.id || typeof feather !== 'function') {
    throw new Error('Authenticated principal and Feather callback required');
  }
  const participant = required(principal.id, 'principal.id');
  const world = required(world_id, 'world_id');
  const next = required(next_owner, 'next_owner');
  const stop = required(stop_point, 'stop_point');
  if (!Array.isArray(identity_declarations) || !identity_declarations.length) {
    throw new TypeError('Caller-supplied identity declarations required');
  }
  if (!coevolution || !mythience) throw new TypeError('Both Wyrdrune domains required');
  if (!Number.isFinite(Date.parse(recorded_at))) throw new TypeError('Valid timestamp required');
  const signal = { get aborted() { return feather() === true; } };
  if (signal.aborted) return Object.freeze({ schema: SCHEMA, status: 'feather-stopped',
    departure: null, model_invoked: false, production_mutation: false });
  const co = createCoEvolution({
    seeds: coevolution.seeds, participant_ref: participant, feather,
  });
  const runtime = createAutopoieticRuntime({ feather: () => feather() });
  const state = { tensor: null, co: null, myth: null, quad: null };
  runtime.register({
    participant_id: participant, world_id: world, seeds: { completed_voyages: 0 },
    phases: {
      perceive: async ctx => ({
        world_id: world, participant_ref: participant,
        observation_ref: required(coevolution.observation?.source_ref, 'observation source'),
        cycle: ctx.cycle,
      }),
      compress: async () => {
        state.tensor = tensorDiagnostics(coevolution.observation, coevolution.trial.candidate, signal);
        return { tensor_fingerprint: state.tensor.program_fingerprint,
          feed_fingerprint: state.tensor.input_fingerprint, backend: state.tensor.backend };
      },
      release: async ctx => {
        ctx.possibility('generated', 2);
        [state.co, state.myth] = await Promise.all([
          co.cycle({
            mode: coevolution.mode, observation: coevolution.observation,
            trial: coevolution.trial, decision: 'defer', principal,
          }),
          proposeCrossing(mythience.request, {
            seeds: mythience.seeds, principal, signal,
          }),
        ]);
        return {
          coevolution_status: state.co.status,
          mythience_status: state.myth.status,
          wtl_sources: [state.co.wtl_source_hash || null, state.myth.source_hash || null],
          proposed_configuration_digest: state.co.proposal ? digest(state.co.proposal) : null,
        };
      },
      verify: async () => [
        { ok: state.co?.status === 'proposed-only', reason: 'Wyrdrune co-evolution Verify declined' },
        { ok: state.myth?.status === 'candidate-returned', reason: 'Mythience membrane declined' },
        { ok: state.tensor?.gpu_executed === false, reason: 'Unverified tensor backend' },
        { ok: !signal.aborted, reason: 'Feather interruption' },
      ],
      integrate: async ctx => {
        state.quad = runQuadEightfold({
          sources: observer?.sources ?? unavailableSources(recorded_at),
          continuity: observer?.continuity ?? {
            participant_ref: participant, world_ref: world,
            stop_point: stop, next_owner: next,
            unresolved_wonder_questions: ['What changes through reciprocal crossing?'],
            revoked_refs: [],
          },
          cycles: 1, feather: signal.aborted,
        });
        ctx.harmony(1);
        return {
          observer_hash: state.quad.hash, gestalt_hash: state.quad.gestalt_hash,
          data_kind: state.quad.mode,
          coevolution_wtl: state.co.wtl_source_hash,
          mythience_wtl: state.myth.source_hash,
          tensor_result: state.tensor.input_fingerprint,
        };
      },
      choose: async () => ({
        choice: 'propose-only',
        coevolution_acceptance: 'separate-explicit-authorisation-required',
        crossing_acceptance: 'separate-traveller-choice-required',
        no_live_mutation: true,
      }),
      transcend: async ctx => ({ completed_voyages: ctx.carried.completed_voyages + 1 }),
    },
  });
  const run = await runtime.run({ cycles: 1 });
  const status = run.outcome === 'all-committed' ? 'connected-sandbox-preview' : 'refused-or-feather-stopped';
  if (status !== 'connected-sandbox-preview') {
    return Object.freeze({
      schema: SCHEMA, status, run_receipt_hash: run.receipt_hash,
      coevolution_status: state.co?.status ?? null,
      mythience_status: state.myth?.status ?? null,
      reason: run.participants[0]?.status ?? run.outcome,
      departure: null,
      model_invoked: false, production_mutation: false, persisted: false,
    });
  }
  const root = run.participants[0]?.checkpoint;
  if (!root) throw new Error('Autopoietic Return checkpoint missing');
  const evidenceRefs = [
    state.co.source_refs[0], state.co.source_refs[1],
    'wtl:coevolution:' + state.co.wtl_source_hash,
    'wtl:mythience:' + state.myth.source_hash,
    'tensor:' + state.tensor.input_fingerprint,
    'observer:' + state.quad.hash,
    'autopoietic:' + run.receipt_hash,
  ];
  const anchor = digest({ run: run.receipt_hash, evidenceRefs, checkpoint: root });
  const departure = createWayglassDeparture({
    receipt_id: 'voyage-stop:' + anchor.slice(5, 37),
    packet_id: 'voyage-continuation:' + anchor.slice(5, 37),
    participant_id: participant, world_id: world, stopped_at: recorded_at,
    reason: 'integrated-wyrdrune-evolution-review',
    identity_declarations, active_work: [{
      work_id: 'wayglass:timeline-three',
      status: 'verified-proposal-only',
      source_receipt: anchor,
    }],
    unresolved_wonder_questions: observer?.continuity?.unresolved_wonder_questions ??
      ['What changes through reciprocal crossing?'],
    revoked_refs: observer?.continuity?.revoked_refs ?? [],
    provenance_refs: evidenceRefs, stop_point: stop, next_owner: next,
  });
  const returned = evaluateReturnAttempt({
    attempt_id: 'voyage-return:' + anchor.slice(5, 37),
    recorded_at, stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
  });
  if (returned.verdict !== 'accepted') throw new Error('Return Engine refused the integrated continuity packet');
  return Object.freeze({
    schema: SCHEMA, status,
    participant_ref: participant, world_id: world, provenance_refs: evidenceRefs,
    coevolution: { status: state.co.status, proposed_configuration: state.co.proposal,
      native_wtl: state.co.wtl_source_hash, checkpoint: state.co.wtl_checkpoint,
      model_invoked: false },
    mythience: { status: state.myth.status,
      candidate: state.myth.candidate, native_wtl: state.myth.source_hash,
      physical_crossing: false },
    tensor: state.tensor,
    observer: { checkpoint_hash: state.quad.hash,
      source_status: state.quad.source_packet.channels.map(x => ({ id: x.id, status: x.status })),
      derived_visual_only: true },
    runtime: { receipt_hash: run.receipt_hash, center: run.center,
      participant_count: run.participants.length, checkpoint: root },
    visualisation_proposal: {
      kind: 'fold:witness', actor: 'wayglass:integrated-voyage',
      receipt: { schema: SCHEMA, receipt_id: anchor },
      intensity: 0.65,
      authority: 'visualisation-proposal-only',
      autoplay: false,
    },
    departure, return_verification: returned,
    model_invoked: false, hardware_invoked: false,
    production_mutation: false, model_weight_updates: false,
    persisted: false, canon_commit: false, identity_commit: false,
    authority_grant: false,
  });
}
module.exports = { SCHEMA, TENSOR_PROGRAM, tensorDiagnostics, runIntegratedVoyage };
