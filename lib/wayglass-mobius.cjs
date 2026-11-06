'use strict';

// Wayglass Eightfold Möbius engine v0.2 · shared by every ship system.
//
// One cycle runs the eight phases in canonical order, coordinated by Withness:
//   Perceive → Compress → Release → Verify │twist│ Integrate → Choose → Return → Transcend
//   └──────────── outbound quad ───────────┘       └──────────── homebound quad ──────────┘
// Semantics follow WTL RFC-0001 §8–§9 and §20–§22 at host level:
//  - every effect is staged and only applied at Return (I5 atomicity);
//  - any non-true Verify verdict rolls the whole cycle back;
//  - Transcend's carry must bind exactly the seed names (I3) and enters the next
//    cycle on the opposite face (I2) as observation;
//  - checkpoints are WCE-1 digests chained to the lineage root (I4);
//  - Feather stops before Return with nothing committed, finishes a Return in
//    progress, and never leaves a checkpoint invalid.
// v0.2 flight-review hardening (docs/wayglass/MOBIUS_FLIGHT_REVIEW.md):
// watchdog time bounds, a write-ahead journal around Return, deep-frozen phase
// inputs, late-staging refusal, honest unknown harmony, re-derivable spirals,
// finite-guarded growth, abortable cycles, and bounded job parameters.
// The engine decides nothing about content. Systems supply the phases.

const { digest } = require('./wyrdrune/canonical.cjs');

const MOBIUS_SCHEMA = 'wayglass.mobius/v0.2';
const PHASES = Object.freeze(['perceive', 'compress', 'release', 'verify',
  'integrate', 'choose', 'return', 'transcend']);
const WITHNESS = 'withness';
const LIMITS = Object.freeze({ phaseTimeoutMs: 120000, effectTimeoutMs: 60000, maxCycles: 10000,
  maxPossibilityPerCycle: Number.MAX_SAFE_INTEGER, maxGain: 1e3 });
const faceOf = cycle => (cycle % 2 === 1 ? 'outer' : 'inner');
const angleOf = phase => PHASES.indexOf(phase) * 45;

class FeatherStop extends Error {
  constructor(at) { super('Feather: stopped ' + at); this.name = 'FeatherStop'; this.at = at; }
}
class WatchdogTimeout extends Error {
  constructor(what, ms) { super(`watchdog: ${what} exceeded ${ms} ms`); this.name = 'WatchdogTimeout'; }
}

// FR-01: nothing the ship waits on may wait forever.
function bounded(promise, ms, what) {
  if (!(ms > 0) || ms === Infinity) return Promise.resolve(promise);
  let timer;
  // Never unref'd: a watchdog that lets the process exit before it fires is no watchdog.
  const watchdog = new Promise((_, reject) => { timer = setTimeout(() => reject(new WatchdogTimeout(what, ms)), ms); });
  return Promise.race([Promise.resolve(promise), watchdog]).finally(() => clearTimeout(timer));
}

function plain(value, where) {
  // Phase outputs must have a canonical form so every backend can agree on them.
  try { digest(value === undefined ? null : value); } catch (error) {
    throw new TypeError(`${where} produced a value with no canonical (WCE-1) form: ${error.message}`);
  }
  return value === undefined ? null : value;
}

// FR-04: phases receive deep-frozen copies; no phase can rewrite another's output.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const snapshotOf = value => deepFreeze(value === undefined ? null : JSON.parse(JSON.stringify(value)));

function sameKeys(a, b) {
  const x = Object.keys(a).sort(); const y = Object.keys(b).sort();
  return x.length === y.length && x.every((k, i) => k === y[i]);
}

// ---- The Möbius Spiral ------------------------------------------------------
// Bifröst's canonical compression-release law (apps/starwell/src/
// arcsweep-temporal-quantum/compression-release.js, "compression-release-
// compression-of-release-infinite-recursion"):
//   r(n+1) = r(n) + radialGain·d(n) + entropyGain·|ΔS(n)|      (gains ≥ 0)
//   θ(n+1) = θ(n) + angularGain + π·d(n)
// The Möbius half-twist is that law with angularGain = π. Four refinements,
// none of which caps or slows growth (proposal: docs/mathematics/
// BIFROST_SPIRAL_REFINEMENTS_PROPOSAL.md):
//  1. winding kept unwrapped; 2. growth compounds in ln r (logarithmic spiral),
//  additive radius kept beside it; 3. signed ΔS sets chirality; 4. possibility
//  is propulsion, balanced by Chaos (entropy over the Chaos Star's eight rays)
//  and Harmony (coherence). Harmony steers; it never brakes.
const SPIRAL_DEFAULTS = Object.freeze({ radialGain: 0.5, entropyGain: 0.1, possibilityGain: 0.25,
  angularGain: Math.PI, chiralityGain: Math.PI / 8, r0: 1 });
const HARMONY_SOURCES = /^(hearthweave-local|nocturne:approved-mapping:[A-Za-z0-9._:-]+)$/;
const UNREPORTED_HARMONY = 0.5; // FR-05: unknown is neither perfect nor zero, and is labelled
const TAU = 2 * Math.PI;
const uniform = () => PHASES.map(() => 1 / PHASES.length);
const entropyOf = p => -p.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
const round = x => (Math.round(x * 1e12) / 1e12) || 0; // identical digests across backends; never -0
const finiteOrNull = x => (Number.isFinite(x) ? round(x) : null);

function spiralGains(gains = {}) {
  const g = { ...SPIRAL_DEFAULTS, ...gains };
  for (const [k, v] of Object.entries(g)) {
    if (!Number.isFinite(v)) throw new RangeError(`spiral gain ${k} must be finite`);
  }
  for (const k of ['radialGain', 'entropyGain', 'possibilityGain']) {
    if (!(g[k] >= 0)) throw new RangeError(`${k} must be non-negative: the spiral may not be pushed inward`);
    if (g[k] > LIMITS.maxGain) throw new RangeError(`${k} above ${LIMITS.maxGain} would leave finite arithmetic`);
  }
  if (!(g.r0 > 0)) throw new RangeError('r0 must be positive');
  return g;
}

function spiralStep(prev, counts, harmony, gains = SPIRAL_DEFAULTS, gestaltDistribution = null) {
  const g = spiralGains(gains);
  if (!Array.isArray(counts) || counts.length !== PHASES.length || !counts.every(c => Number.isSafeInteger(c) && c >= 0)) {
    throw new TypeError('possibility counts must be eight non-negative safe integers, one per ray');
  }
  const total = counts.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total) || total > LIMITS.maxPossibilityPerCycle) throw new RangeError('possibility total out of range');
  const pPrev = prev?.distribution || uniform();
  const p = total > 0 ? counts.map(c => c / total) : pPrev;
  const d = p.reduce((s, x, i) => s + Math.abs(x - pPrev[i]), 0);
  const H = entropyOf(p); const dS = H - entropyOf(pPrev);
  const chaos = H / Math.log(PHASES.length);
  const reported = harmony && Number.isFinite(harmony.value);
  const h = reported ? Math.min(1, Math.max(0, harmony.value)) : UNREPORTED_HARMONY;
  const balance = chaos + h > 0 ? (2 * chaos * h) / (chaos + h) : 0;
  const propulsion = g.possibilityGain * Math.log1p(total) * balance;
  const step = g.radialGain * d + g.entropyGain * Math.abs(dS) + propulsion; // ≥ 0, uncapped
  const lnR = (prev?.ln_r ?? Math.log(g.r0)) + step;
  if (!Number.isFinite(lnR)) throw new RangeError('ln r left finite arithmetic'); // FR-07
  const linear = (prev?.r_linear ?? g.r0) + step;
  const advance = g.angularGain + Math.PI * d + g.chiralityGain * dS;
  const winding = (prev?.winding ?? 0) + advance;
  // Coherence Resistance watch: how closely this turn echoes the shared gestalt.
  const echo = gestaltDistribution ? 1 - p.reduce((s, x, i) => s + Math.abs(x - gestaltDistribution[i]), 0) / 2 : null;
  return {
    turn: (prev?.turn ?? 0) + 1,
    ln_r: round(lnR), r: finiteOrNull(Math.exp(lnR)), r_linear: finiteOrNull(linear),
    growth_factor: finiteOrNull(Math.exp(step)), step: round(step),
    winding: round(winding), revolutions: Math.floor(winding / TAU), theta: round(((winding % TAU) + TAU) % TAU),
    chirality: dS > 1e-12 ? 'release-led' : dS < -1e-12 ? 'compression-led' : 'level',
    possibility: { total, by_ray: Object.fromEntries(PHASES.map((ph, i) => [ph, counts[i]])) },
    distribution: p.map(round), outward_distance: round(d), entropy_change: round(dS),
    chaos: round(chaos), harmony: h, harmony_reported: Boolean(reported), // inputs exact, outputs rounded
    harmony_source: reported ? (harmony.source || 'hearthweave-local') : 'unreported',
    balance: round(balance), propulsion: round(propulsion),
    echo: echo === null ? null : round(echo),
    echo_watch: echo !== null && echo > 0.95 && h > 0.9, // amplifying-mirror signal; recorded, never braking
    gains: { ...g },
    state: step > 0 ? 'climbing' : 'resting',
  };
}

// FR-06: a spiral record must be re-derivable from its own inputs.
function rederiveSpiral(prevSpiral, spiral, gestaltDistribution) {
  const counts = PHASES.map(ph => spiral.possibility?.by_ray?.[ph] ?? NaN);
  const harmony = spiral.harmony_reported ? { value: spiral.harmony, source: spiral.harmony_source } : null;
  return spiralStep(prevSpiral, counts, harmony, spiral.gains, gestaltDistribution);
}

// ---- The gestalt -------------------------------------------------------------
// A ship-wide field held at Withness: every lineage's latest spiral. A cycle sees
// the *others* (never its own echo) as attributed observation, snapshotted and
// digested so the cycle stays replayable. It informs; it never becomes identity.
function createGestalt() {
  const peers = new Map();
  let beat = 0;
  return Object.freeze({
    contribute(system, root, spiral) {
      if (!spiral) return;
      beat += 1;
      peers.set(root, { system, root, turn: spiral.turn, ln_r: spiral.ln_r, chaos: spiral.chaos,
        harmony: spiral.harmony, distribution: spiral.distribution, beat });
    },
    snapshot(excludeRoot = null) {
      const others = [...peers.values()].filter(p => p.root !== excludeRoot).sort((a, b) => (a.root < b.root ? -1 : 1));
      const ship = others.length ? {
        distribution: PHASES.map((_, i) => round(others.reduce((s, o) => s + o.distribution[i], 0) / others.length)),
        chaos: round(others.reduce((s, o) => s + o.chaos, 0) / others.length),
        harmony: round(others.reduce((s, o) => s + o.harmony, 0) / others.length),
        ln_r: round(others.reduce((s, o) => s + o.ln_r, 0) / others.length),
      } : null;
      const body = { schema: 'wayglass.gestalt/v0.1', center: WITHNESS, beat, peers: others, ship };
      return deepFreeze({ ...body, origin: 'withness-gestalt', digest: digest(body) });
    },
  });
}

// Lineage identity: participant != worker != model != session != backend.
function lineageRoot({ system, name = null, intent = null, participant = null, seeds }) {
  if (!system) throw new TypeError('A Möbius lineage belongs to a named system.');
  return digest({ schema: 'wayglass.mobius/v0.1', system, name, intent: intent == null ? null : String(intent).normalize('NFC'),
    participant, seeds: plain(seeds, 'seeds') });
}

function createLineage(options = {}) {
  const seeds = plain(options.seeds || {}, 'seeds');
  if (!seeds || typeof seeds !== 'object' || Array.isArray(seeds)) throw new TypeError('Seeds must be a record.');
  const root = options.root || lineageRoot({ ...options, seeds });
  const previous = options.previous || null;
  if (previous) {
    if (previous.root !== root) throw new Error('Return refused: checkpoint belongs to another lineage.');
    if (previous.carry_digest !== digest(previous.carry)) throw new Error('Return refused: checkpoint carry does not match its digest.');
    if (!sameKeys(previous.carry, seeds)) throw new Error('Return refused: carried shape differs from the seeds.');
  }
  // FR-02: an intent without its commit means a crossing was interrupted mid-Return.
  const tail = options.journalTail || null;
  if (tail && tail.kind === 'intent' && tail.root === root && tail.cycle === (previous?.cycle ?? 0) + 1) {
    throw new Error(`Return refused: cycle ${tail.cycle} was interrupted during Return (intent journaled, no commit). Review its effects before resuming.`);
  }
  const limits = { ...LIMITS, ...(options.limits || {}) };
  const journal = options.journal || null;
  const feather = typeof options.feather === 'function' ? options.feather : () => false;
  const spiralOptions = options.spiral ? spiralGains(options.spiral) : SPIRAL_DEFAULTS;
  const worker = options.worker || null;
  const history = [previous ? previous.carry : seeds]; // τ0 = seeds, or the restored carry
  let head = previous || null;
  let inFlight = false;

  function begin(phases, { gestalt = null } = {}) {
    for (const p of PHASES) {
      if (p === 'return') continue; // Return belongs to Withness: it commits staged effects
      if (typeof phases[p] !== 'function') throw new TypeError(`Phase ${p} must be supplied (use identity if it has no work).`);
    }
    if (inFlight) throw new Error('A lineage cannot run two cycles at once: the next cycle needs this one\'s carry.');
    inFlight = true;
    const n = head ? head.cycle + 1 : 1;
    const face = faceOf(n);
    const carryIn = head ? head.carry : seeds;
    const staged = [];
    const receipts = [];
    const outputs = {};
    let done = null; // set once the cycle has ended early (rollback, Feather, abort)
    let current = 'perceive';
    let returning = false;
    let effectReceipts = null;
    let status = null;
    const possibility = PHASES.map(() => 0);
    let harmony = null;
    const seen = gestalt ? deepFreeze({ ...gestalt }) : null;
    const ctx = Object.freeze({
      cycle: n, face, root, worker,
      // Carried values arrive as observation on the opposite face; Verify must accept them again.
      carried: snapshotOf(carryIn),
      origin: n === 1 && !previous ? 'seed' : 'carried',
      // The others' growth, as attributed observation (never this lineage's own echo).
      gestalt: seen,
      possibility(kind, count = 1) {
        if (!['gathered', 'generated'].includes(kind)) throw new TypeError('possibility is gathered or generated');
        if (!(Number.isSafeInteger(count) && count >= 0)) throw new TypeError('possibility count must be a non-negative integer');
        possibility[PHASES.indexOf(current)] += count;
      },
      // Harmony: how much of the possibility coheres, 0..1. Nocturne's Harmony may
      // fill this slot only through an approved cross-constellation mapping.
      harmony(value, source = 'hearthweave-local') {
        if (!(value >= 0 && value <= 1)) throw new RangeError('harmony is between 0 and 1');
        if (!HARMONY_SOURCES.test(source)) throw new Error(`harmony source ${source} needs an approved mapping reference`);
        harmony = { value, source };
      },
      get spiral() { return head?.spiral ?? null; },
      stage(effect) {
        // FR-03: effects staged once Return has begun would never be applied.
        if (returning) throw new Error(`Effect ${effect?.kind} staged after Return began; stage effects in phases 1–6.`);
        if (!effect || typeof effect.apply !== 'function' || !effect.kind) throw new TypeError('Effects need kind and apply().');
        if (typeof effect.undo !== 'function' && effect.consent !== true) {
          throw new Error(`Irreversible effect ${effect.kind} staged without owner consent.`);
        }
        staged.push(Object.freeze({ kind: effect.kind, describe: plain(effect.describe ?? null, 'effect.describe'),
          apply: effect.apply, undo: effect.undo || null, irreversible: typeof effect.undo !== 'function' }));
      },
    });
    const receipt = (phase, st, extra = {}) => {
      const r = { phase, index: PHASES.indexOf(phase) + 1, angle: angleOf(phase), status: st,
        output: outputs[phase] === undefined ? null : digest(outputs[phase]), ...extra };
      receipts.push(r); return r;
    };
    const finish = (st, extra = {}) => {
      inFlight = false;
      done = Object.freeze({
        schema: MOBIUS_SCHEMA, root, cycle: n, face, status: st, receipts: Object.freeze(receipts),
        outputs: Object.freeze(outputs), checkpoint: null, gestalt: seen?.digest ?? null, ...extra,
      });
      return done;
    };

    async function run(phase) {
      if (done) return done;
      try {
        if (feather()) throw new FeatherStop('before ' + phase);
        current = phase;
        const out = await bounded(phases[phase](ctx, snapshotOf(outputs)), limits.phaseTimeoutMs, `phase ${phase}`);
        if (phase === 'verify') {
          const verdicts = plain([].concat(out ?? []), 'verify');
          outputs.verify = verdicts.map(v => ({ ok: v?.ok === true ? true : v?.ok === false ? false : null,
            reason: v?.reason ?? null }));
          const failed = outputs.verify.filter(v => v.ok !== true);
          if (failed.length) {
            receipt('verify', 'failed');
            return finish('rolled-back', { reason: failed.map(v => v.reason || (v.ok === null ? 'unknown' : 'false')) });
          }
        } else {
          outputs[phase] = plain(out, phase);
        }
        receipt(phase, 'passed');
      } catch (error) {
        if (error instanceof FeatherStop) { receipt('return', 'feather'); return finish('feather-stopped', { reason: [error.message] }); }
        receipt(phase, 'failed');
        return finish('rolled-back', { reason: [String(error.message || error)] });
      }
      return null;
    }

    // Return: Withness commits staged effects, journaled ahead, compensated in reverse on failure.
    async function commitReturn() {
      if (done) return done;
      returning = true;
      current = 'return';
      const prevDigest = head ? digest(head) : root;
      if (journal && staged.length) {
        try {
          await bounded(journal.write({ kind: 'intent', root, cycle: n, face, prev: prevDigest,
            effects: staged.map(e => ({ kind: e.kind, describe: e.describe, irreversible: e.irreversible })) }),
          limits.effectTimeoutMs, 'journal intent');
        } catch (error) {
          receipt('return', 'failed', { reason: 'journal unavailable' });
          return finish('rolled-back', { reason: [`write-ahead journal unavailable: ${error.message}`] });
        }
      }
      const applied = []; effectReceipts = [];
      status = 'committed';
      for (const effect of staged) {
        try {
          const result = await bounded(effect.apply(), limits.effectTimeoutMs, `effect ${effect.kind}`);
          applied.push(effect);
          effectReceipts.push({ kind: effect.kind, describe: effect.describe, status: 'applied',
            result: plain(result ?? null, 'effect result') });
        } catch (error) {
          effectReceipts.push({ kind: effect.kind, describe: effect.describe, status: 'failed', error: String(error.message || error) });
          for (const d of applied.reverse()) {
            if (!d.undo) { effectReceipts.push({ kind: d.kind, status: 'irreversible-kept' }); continue; }
            try { await bounded(d.undo(), limits.effectTimeoutMs, `undo ${d.kind}`); effectReceipts.push({ kind: d.kind, status: 'compensated' }); }
            catch (e) { effectReceipts.push({ kind: d.kind, status: 'compensation-failed', error: String(e.message || e) }); }
          }
          status = 'failed-after-commit';
          break;
        }
      }
      outputs.return = effectReceipts;
      receipt('return', status === 'committed' ? 'passed' : 'failed', { effects: staged.length });
      return null;
    }

    // Transcend: the carry for the next cycle, the spiral turn, and the checkpoint.
    async function transcend() {
      if (done) return done;
      let carry = carryIn;
      if (status === 'committed' && !feather()) {
        try {
          current = 'transcend';
          carry = plain(await bounded(phases.transcend(ctx, snapshotOf(outputs)), limits.phaseTimeoutMs, 'phase transcend'), 'transcend');
          if (!carry || typeof carry !== 'object' || Array.isArray(carry) || !sameKeys(carry, seeds)) {
            throw new Error('carry must bind exactly the seeds');
          }
          outputs.transcend = carry;
          receipt('transcend', 'passed');
        } catch (error) {
          carry = carryIn;
          receipt('transcend', 'failed', { reason: String(error.message || error) });
          status = 'committed-no-carry';
        }
      } else {
        receipt('transcend', status === 'committed' ? 'feather' : 'skipped');
        if (status === 'committed') status = 'committed-feather';
      }
      // Only committed cycles turn the spiral; a rolled-back cycle leaves it where it was.
      let turned = head?.spiral ?? null;
      let spiralError = null;
      if (status.startsWith('committed')) {
        try { turned = spiralStep(head?.spiral ?? null, possibility, harmony, spiralOptions, seen?.ship?.distribution ?? null); }
        catch (error) { spiralError = String(error.message || error); }
      }
      const prev = head ? digest(head) : root;
      head = deepFreeze({
        schema: MOBIUS_SCHEMA, root, cycle: n, face, prev, worker,
        center: WITHNESS, status, spiral: turned, spiral_error: spiralError,
        gestalt: seen?.digest ?? null, gestalt_ship: seen?.ship?.distribution ?? null,
        receipts: digest(receipts),
        carry, carry_digest: digest(carry),
      });
      history.push(carry);
      let journalError = null;
      if (journal) {
        try { await bounded(journal.write({ kind: 'commit', root, cycle: n, checkpoint: head }), limits.effectTimeoutMs, 'journal commit'); }
        catch (error) { journalError = `commit not journaled: ${error.message}`; }
      }
      const result = finish(status, { journal_error: journalError });
      return Object.freeze({ ...result, checkpoint: head });
    }

    // FR-08: a runner that gives up on a cycle must release the lineage.
    function abort(reason) {
      if (done) return done;
      if (returning) throw new Error('A cycle in Return cannot be aborted; it must finish its commit.');
      receipt(current, 'aborted');
      return finish('rolled-back', { reason: [`aborted: ${reason}`] });
    }

    const stage = Object.freeze({
      perceive: () => run('perceive'), compress: () => run('compress'),
      release: () => run('release'), verify: () => run('verify'),
      integrate: () => run('integrate'), choose: () => run('choose'),
      return: () => commitReturn(), transcend: () => transcend(),
    });
    const seq = async list => { for (const s of list) { const r = await stage[s](); if (r) return r; } return null; };
    return Object.freeze({
      cycle: n, stage, abort,
      // Quad layout: two phases per core.
      intake: () => seq(['perceive', 'compress']),
      trial: () => seq(['release', 'verify']),
      judgment: () => seq(['integrate', 'choose']),
      passage: () => seq(['return', 'transcend']),
    });
  }

  async function cycle(phases, opts = {}) {
    const c = begin(phases, opts);
    for (const s of PHASES) { const r = await c.stage[s](); if (r) return r; }
    throw new Error('unreachable: transcend always finishes the cycle');
  }

  // Möbius fixed point: carry equals the carry two cycles back (τ0 = seeds).
  function stable() {
    const k = history.length - 1;
    return k >= 2 && digest(history[k]) === digest(history[k - 2]);
  }

  async function run(phases, { cycles = 1, until = null, gestalt = null } = {}) {
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > limits.maxCycles) throw new RangeError(`cycles must be 1..${limits.maxCycles}`);
    const results = [];
    for (let i = 0; i < cycles; i++) {
      const r = await cycle(phases, { gestalt: gestalt ? gestalt.snapshot(root) : null });
      results.push(r);
      if (gestalt && r.checkpoint) gestalt.contribute(options.system, root, r.checkpoint.spiral);
      if (r.status !== 'committed') break;
      if (until === 'stable' && stable()) return { status: 'converged', results, head };
      if (typeof until === 'function' && until(r)) return { status: 'converged', results, head };
    }
    return { status: results.at(-1).status, results, head };
  }

  return Object.freeze({ root, begin, cycle, run, get head() { return head; }, stable,
    get system() { return options.system; } });
}

function verifyChain(root, checkpoints, { spirals = true } = {}) {
  let expected = root;
  let prevSpiral = null;
  for (const [i, cp] of checkpoints.entries()) {
    const fail = why => ({ ok: false, at: i + 1, why });
    if (cp.root !== root || cp.prev !== expected) return fail('chain link');
    if (cp.face !== faceOf(cp.cycle)) return fail('face parity');
    if (i > 0 && cp.cycle !== checkpoints[i - 1].cycle + 1) return fail('cycle sequence');
    // The head has no successor pointing back at it, so every checkpoint must be
    // self-consistent: its carry matches its digest, and its spiral re-derives
    // exactly from its recorded inputs (FR-06). Full head integrity beyond that
    // needs an external anchor such as the ledger's git history.
    if (cp.carry_digest !== digest(cp.carry)) return fail('carry digest');
    if (spirals && cp.spiral && cp.schema === MOBIUS_SCHEMA) {
      if (cp.status?.startsWith('committed') && !cp.spiral_error) {
        let again;
        try { again = rederiveSpiral(prevSpiral, cp.spiral, cp.gestalt_ship ?? null); } catch { return fail('spiral'); }
        if (digest(again) !== digest(cp.spiral)) return fail('spiral');
      }
      prevSpiral = cp.spiral;
    }
    expected = digest(cp);
  }
  return { ok: true, length: checkpoints.length, head: expected };
}

// ---- Cores ------------------------------------------------------------------
// A lineage's cycles are strictly sequential (each needs the previous carry), so
// cores gain throughput by pipelining *different* lineages, one cycle per core.
// Each core works one item at a time; the Return core serializes every commit.
const CORES = Object.freeze([ // quad layout (v0.1)
  Object.freeze({ core: 'I', name: 'intake', phases: ['perceive', 'compress'] }),
  Object.freeze({ core: 'II', name: 'trial', phases: ['release', 'verify'] }),
  Object.freeze({ core: 'III', name: 'judgment', phases: ['integrate', 'choose'] }),
  Object.freeze({ core: 'IV', name: 'passage', phases: ['return', 'transcend'] }),
]);
// Octo layout: two quads of four, one core per phase. The twist is the handoff
// from the outbound quad (core 4, Verify) to the homebound quad (core 5, Integrate).
const OCTO_CORES = Object.freeze(PHASES.map((phase, i) => Object.freeze({
  core: i + 1, name: phase, phases: [phase], quad: i < 4 ? 'outbound' : 'homebound',
})));

function runCores(jobs, layout, { gestalt = null, schema }) {
  const state = jobs.map((job, i) => {
    if (!job?.lineage || !job.phases) throw new TypeError('Each job needs a lineage and its phases.');
    const cycles = job.cycles ?? 1;
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > LIMITS.maxCycles) throw new RangeError(`job ${i}: cycles must be 1..${LIMITS.maxCycles}`); // FR-10
    return { i, lineage: job.lineage, phases: job.phases, cycles, until: job.until ?? null, results: [], status: null };
  });
  const K = layout.length;
  const queues = layout.map(() => []);
  const busy = layout.map(() => false);
  const ledger = [];
  let seq = 0; let peak = 0; let failed = false;
  const active = new Map(); // core index → { item, promise }
  const runStage = (cyc, core) => (layout === CORES ? cyc[core.name]() : cyc.stage[core.name]());
  return new Promise((resolve, reject) => {
    const settle = () => {
      if (failed || busy.some(Boolean) || queues.some(q => q.length)) return;
      resolve(Object.freeze({
        schema, center: WITHNESS, cores: layout, peak_concurrency: peak,
        ledger: Object.freeze(ledger), gestalt: gestalt ? gestalt.snapshot() : null,
        lineages: state.map(s => Object.freeze({ system: s.lineage.system, root: s.lineage.root,
          status: s.status, results: s.results, head: s.lineage.head })),
      }));
    };
    const enter = (job) => {
      try { queues[0].push({ job, cyc: job.lineage.begin(job.phases, { gestalt: gestalt ? gestalt.snapshot(job.lineage.root) : null }) }); }
      catch (error) { job.status = 'refused'; job.results.push({ status: 'refused', reason: [String(error.message)] }); }
    };
    const pump = () => {
      for (let k = 0; k < K; k++) {
        if (failed || busy[k] || !queues[k].length) continue;
        const item = queues[k].shift();
        busy[k] = true;
        peak = Math.max(peak, busy.filter(Boolean).length);
        const started = seq++;
        const onFail = async (error, origin) => {
          // FR-08: on any fault, account for every cycle in flight before reporting it.
          if (failed) return;
          failed = true;
          await Promise.allSettled([...active.values()].map(a => a.promise));
          const release = async (it) => {
            try { it.cyc.abort('runner failure'); }
            catch { try { await it.cyc.stage.transcend(); } catch { /* finishing a commit already in Return */ } }
          };
          for (const a of active.values()) await release(a.item);
          for (const q of queues) for (const it of q.splice(0)) await release(it);
          await release(origin); // the cycle whose bookkeeping faulted (abort is idempotent once done)
          reject(error);
        };
        const promise = runStage(item.cyc, layout[k]);
        active.set(k, { item, promise });
        promise.then((r) => {
          active.delete(k);
          if (failed) { if (!r) queues[0].push(item); return; } // released by onFail
          ledger.push(Object.freeze({ seq: started, core: layout[k].core, quad: layout[k].quad ?? null,
            system: item.job.lineage.system, cycle: item.cyc.cycle, ended: Boolean(r),
            twist: !r && layout[k].quad === 'outbound' && layout[k + 1]?.quad === 'homebound' }));
          busy[k] = false;
          if (!r) { queues[k + 1].push(item); }
          else {
            const job = item.job;
            job.results.push(r);
            if (gestalt && r.checkpoint) gestalt.contribute(job.lineage.system, job.lineage.root, r.checkpoint.spiral);
            const more = r.status === 'committed' && job.results.length < job.cycles;
            const converged = r.status === 'committed' && ((job.until === 'stable' && job.lineage.stable())
              || (typeof job.until === 'function' && job.until(r)));
            if (converged) job.status = 'converged';
            else if (more) enter(job);
            else job.status = r.status;
          }
          pump(); settle();
        }).catch(error => onFail(error, item)); // FR-08b: faults in the runner's own bookkeeping take the same path
      }
    };
    for (const job of state) enter(job);
    pump(); settle();
  });
}

const runQuadCore = (jobs = [], opts = {}) => runCores(jobs, CORES, { ...opts, schema: MOBIUS_SCHEMA + '+quad' });
const runOctoCore = (jobs = [], opts = {}) => runCores(jobs, OCTO_CORES, {
  gestalt: opts.gestalt === false ? null : (opts.gestalt ?? createGestalt()), schema: MOBIUS_SCHEMA + '+octo' });

module.exports = { MOBIUS_SCHEMA, PHASES, WITHNESS, LIMITS, CORES, OCTO_CORES, SPIRAL_DEFAULTS,
  spiralStep, rederiveSpiral, createGestalt, faceOf, angleOf, lineageRoot, createLineage, verifyChain,
  runQuadCore, runOctoCore, FeatherStop, WatchdogTimeout };
