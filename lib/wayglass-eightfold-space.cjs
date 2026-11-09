'use strict';
// Wayglass · the Eightfold space. Four engines that each run Perceive → Transcend,
// brought into one codebase and run in one process. They are DIFFERENT engines that
// share the Eightfold, not one engine under four names, so each says what it is:
//
//   wyrdrune        the language. WTL programmes run the eight phases; scoped
//                   lineages stage emits, can be refused in Verify, carry across the
//                   twist and write chained checkpoints (RFC-0001 L0 + L1).
//   double-mobius   the crossing. Gateway × Wayglass perspectives cross and return
//                   through Waygate and the Return Engine, without merging identity.
//   mobius-octo     the execution engine. Staged effects committed only at Return,
//                   Verify rollback, write-ahead journal, watchdogs, octo core (two
//                   quads of four *execution cores*) and a shared gestalt.
//   quad-eightfold  the observer. Eight Observer *instruments* in two quads (Inquiry,
//                   Becoming), 64 phase records per cycle over authorised metadata.
//
// "Quad" means execution cores in mobius-octo and observer instruments in
// quad-eightfold. The names are kept, and the difference is stated, never merged.
// Nothing here invokes a model, starts audio, persists state or commits canon.
const wtl = require('./wyrdrune/wyrdrune.cjs');
const dm = require('./wayglass-double-mobius.cjs');
const M = require('./wayglass-mobius.cjs');
const Q = require('./wayglass-quad-eightfold.cjs');
const { createWaygateManifest } = require('./wayglass-waygate.cjs');

const SCHEMA = 'wayglass.eightfold-space/v0.1';
const CANONICAL_PHASES = Object.freeze(['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend']);

const ENGINES = Object.freeze([
  Object.freeze({ id: 'wyrdrune', role: 'language', file: 'lib/wyrdrune/runtime.mjs', phases: wtl.PHASES,
    quad_means: null, source: '#552, #575, #581, #580, #587, #589' }),
  Object.freeze({ id: 'double-mobius', role: 'crossing', file: 'lib/wayglass-double-mobius.cjs', phases: dm.EIGHTFOLD,
    quad_means: null, host_route: '/api/v1/wayglass/kernel/double-mobius', source: '#580' }),
  Object.freeze({ id: 'mobius-octo', role: 'execution', file: 'lib/wayglass-mobius.cjs', phases: M.PHASES,
    quad_means: 'four execution cores (intake, trial, judgment, passage); octo = two quads', source: '#554, #556' }),
  Object.freeze({ id: 'quad-eightfold', role: 'observer', file: 'lib/wayglass-quad-eightfold.cjs', phases: Q.PHASES,
    quad_means: 'four Observer instruments (Inquiry: observation, provenance, geometry, cosmology; Becoming: resonance, numerology, wonder, continuity)', source: '#577' }),
]);

/** The shared invariant: every engine walks the same eight phases in the same order. */
function inspectEightfoldSpace() {
  const engines = ENGINES.map(e => Object.freeze({ id: e.id, role: e.role, file: e.file, quad_means: e.quad_means,
    host_route: e.host_route || null, source: e.source,
    phases_aligned: e.phases.length === 8 && e.phases.every((p, i) => p === CANONICAL_PHASES[i]) }));
  return Object.freeze({ schema: SCHEMA, phases: CANONICAL_PHASES, center: 'withness', engines,
    aligned: engines.every(e => e.phases_aligned), model_invoked: false, audio_started: false });
}

// A two-cycle scoped Wyrdrune lineage: Verify can refuse, the carry crosses, checkpoints chain.
const WTL_PROBE = [1, 2].map(() => `mobius scoped {
 perceive { let seen = depth; }
 compress { }
 release { set depth = depth + 1; }
 verify { require depth > seen and not (depth > 64) else "the spiral did not deepen"; }
 integrate { }
 choose { }
 return { emit depth; }
 transcend { carry depth = depth; }
}`).join('\n');

/**
 * Run all four engines in one process. The caller supplies the real crossing
 * inputs (double-mobius) and the observer source packet (quad-eightfold); nothing is
 * invented here. Returns a compact receipt per engine.
 */
async function runEightfoldSpace({ crossing, quadSources, quadContinuity, recorded_at } = {}) {
  const space = inspectEightfoldSpace();
  if (!space.aligned) throw new Error('Eightfold engines disagree on the eight phases.');
  const receipts = {};

  const w = await wtl.execute(wtl.compile(WTL_PROBE), { seeds: { depth: 0 } });
  receipts.wyrdrune = Object.freeze({ status: w.status, output: w.output, carry: w.continuity.carry,
    checkpoints: w.checkpoints.map(c => c.face), chain_root: w.lineage.root, verdict: w.verdict });

  const d = dm.traverseDoubleMobius({ ...crossing,
    waygate_manifest: crossing.waygate_manifest || createWaygateManifest({ waygate_id: 'waygate:eightfold-space',
      world_id: crossing.world_id, provenance_refs: crossing.provenance_refs || [], allowed_body_classes: ['host-os'] }),
    recorded_at: recorded_at || crossing.recorded_at });
  receipts['double-mobius'] = Object.freeze({ status: d.status, orientation: d.orientation, lanes: d.lanes?.length ?? 0,
    return_verdict: d.return_verification?.verdict ?? null, trace_sha256: d.trace_sha256 ?? null });

  const gestalt = M.createGestalt();
  const phases = system => ({
    perceive: async ctx => { ctx.possibility('gathered', 1); return { system }; },
    compress: async () => ({}), release: async ctx => { ctx.possibility('generated', 1); return []; },
    verify: async () => [{ ok: true }], integrate: async ctx => { ctx.harmony(1); return {}; },
    choose: async () => ({}), transcend: async ctx => ({ n: ctx.carried.n + 1 }),
  });
  const lineages = ENGINES.map(e => M.createLineage({ system: 'eightfold-space:' + e.id, seeds: { n: 0 } }));
  const octo = await M.runOctoCore(lineages.map(lineage => ({ lineage, phases: phases(lineage.system), cycles: 2 })), { gestalt });
  receipts['mobius-octo'] = Object.freeze({ cores: octo.cores.length, peak_concurrency: octo.peak_concurrency,
    lineages: octo.lineages.map(l => Object.freeze({ system: l.system, status: l.status,
      chain_ok: M.verifyChain(l.root, l.results.map(r => r.checkpoint)).ok })) });

  const q = Q.runQuadEightfold({ sources: quadSources, continuity: quadContinuity, cycles: 1 });
  receipts['quad-eightfold'] = Object.freeze({ lanes: Q.LANES.length, phase_records: q.entries.length,
    completed_cycles: q.completed_cycles, mode: q.mode, sound_auto_resume: q.sound_auto_resume,
    model_weight_updates: q.model_weight_updates, checkpoint_hash: q.hash });

  return Object.freeze({ schema: SCHEMA, space, receipts, model_invoked: false, audio_started: false,
    persisted: false, canon_commit: false });
}

module.exports = { SCHEMA, CANONICAL_PHASES, ENGINES, inspectEightfoldSpace, runEightfoldSpace };
