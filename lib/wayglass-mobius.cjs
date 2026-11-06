'use strict';

// Wayglass Eightfold Möbius engine v0.1 · shared by every ship system.
//
// One cycle runs the eight phases in canonical order, coordinated by Withness:
//   Perceive → Compress → Release → Verify → Integrate → Choose → Return → Transcend
// Semantics follow WTL RFC-0001 §8–§9 and §20–§22 at host level:
//  - every effect is staged and only applied at Return (I5 atomicity);
//  - any non-true Verify verdict rolls the whole cycle back, leaving no trace
//    but its failure receipt;
//  - Transcend's carry must bind exactly the seed names (I3 shape) and enters
//    the next cycle on the opposite face (I2 parity) as observation;
//  - checkpoints are WCE-1 digests chained to the lineage root (I4);
//  - Feather stops before Return with nothing committed, finishes a Return in
//    progress, and never leaves a checkpoint invalid.
// The engine decides nothing about content. Systems supply the phases.

const { digest } = require('./wyrdrune/canonical.cjs');

const MOBIUS_SCHEMA = 'wayglass.mobius/v0.1';
const PHASES = Object.freeze(['perceive', 'compress', 'release', 'verify',
  'integrate', 'choose', 'return', 'transcend']);
const WITHNESS = 'withness';
const faceOf = cycle => (cycle % 2 === 1 ? 'outer' : 'inner');
const angleOf = phase => PHASES.indexOf(phase) * 45;

class FeatherStop extends Error {
  constructor(at) { super('Feather: stopped ' + at); this.name = 'FeatherStop'; this.at = at; }
}

function plain(value, where) {
  // Phase outputs must have a canonical form so every backend can agree on them.
  try { digest(value === undefined ? null : value); } catch (error) {
    throw new TypeError(`${where} produced a value with no canonical (WCE-1) form: ${error.message}`);
  }
  return value === undefined ? null : value;
}

function sameKeys(a, b) {
  const x = Object.keys(a).sort(); const y = Object.keys(b).sort();
  return x.length === y.length && x.every((k, i) => k === y[i]);
}

// Lineage identity: participant != worker != model != session != backend.
function lineageRoot({ system, name = null, intent = null, participant = null, seeds }) {
  if (!system) throw new TypeError('A Möbius lineage belongs to a named system.');
  return digest({ schema: MOBIUS_SCHEMA, system, name, intent: intent == null ? null : String(intent).normalize('NFC'),
    participant, seeds: plain(seeds, 'seeds') });
}

function createLineage(options = {}) {
  const seeds = plain(options.seeds || {}, 'seeds');
  if (!seeds || typeof seeds !== 'object' || Array.isArray(seeds)) throw new TypeError('Seeds must be a record.');
  const root = options.root || lineageRoot({ ...options, seeds });
  const previous = options.previous || null;
  if (previous) {
    if (previous.root !== root) throw new Error('Return refused: checkpoint belongs to another lineage.');
    if (!sameKeys(previous.carry, seeds)) throw new Error('Return refused: carried shape differs from the seeds.');
  }
  const feather = typeof options.feather === 'function' ? options.feather : () => false;
  const worker = options.worker || null;
  const history = [previous ? previous.carry : seeds]; // τ0 = seeds, or the restored carry
  let head = previous || null;
  let inFlight = false;

  // A cycle is split into four cores (two phases each) so the quad-core
  // scheduler can pipeline different lineages. cycle() runs them in order.
  function begin(phases) {
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
    let done = null; // set once the cycle has ended early (rollback or Feather)
    const ctx = Object.freeze({
      cycle: n, face, root, worker,
      // Carried values arrive as observation on the opposite face; Verify must accept them again.
      carried: Object.freeze({ ...carryIn }),
      origin: n === 1 && !previous ? 'seed' : 'carried',
      stage(effect) {
        if (!effect || typeof effect.apply !== 'function' || !effect.kind) throw new TypeError('Effects need kind and apply().');
        if (typeof effect.undo !== 'function' && effect.consent !== true) {
          throw new Error(`Irreversible effect ${effect.kind} staged without owner consent.`);
        }
        staged.push(Object.freeze({ kind: effect.kind, describe: plain(effect.describe ?? null, 'effect.describe'),
          apply: effect.apply, undo: effect.undo || null }));
      },
    });
    const receipt = (phase, status, extra = {}) => {
      const r = { phase, index: PHASES.indexOf(phase) + 1, angle: angleOf(phase), status,
        output: outputs[phase] === undefined ? null : digest(outputs[phase]), ...extra };
      receipts.push(r); return r;
    };
    const finish = (status, extra = {}) => {
      inFlight = false;
      done = Object.freeze({
        schema: MOBIUS_SCHEMA, root, cycle: n, face, status, receipts: Object.freeze(receipts),
        outputs: Object.freeze(outputs), checkpoint: null, ...extra,
      });
      return done;
    };

    async function pre(list) {
      if (done) return done;
      try {
        for (const phase of list) {
          if (feather()) throw new FeatherStop('before ' + phase);
          const out = await phases[phase](ctx, outputs);
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
        }
      } catch (error) {
        if (error instanceof FeatherStop) { receipt('return', 'feather'); return finish('feather-stopped', { reason: [error.message] }); }
        receipt('fault', 'failed');
        return finish('rolled-back', { reason: [String(error.message || error)] });
      }
      return null;
    }

    async function passage() {
      if (done) return done;
      // Return: Withness commits staged effects in order; on failure compensate in reverse.
      const applied = []; const effectReceipts = [];
      let status = 'committed';
      for (const effect of staged) {
        try {
          const result = await effect.apply();
          applied.push(effect);
          effectReceipts.push({ kind: effect.kind, describe: effect.describe, status: 'applied',
            result: plain(result ?? null, 'effect result') });
        } catch (error) {
          effectReceipts.push({ kind: effect.kind, describe: effect.describe, status: 'failed', error: String(error.message || error) });
          for (const d of applied.reverse()) {
            if (!d.undo) { effectReceipts.push({ kind: d.kind, status: 'irreversible-kept' }); continue; }
            try { await d.undo(); effectReceipts.push({ kind: d.kind, status: 'compensated' }); }
            catch (e) { effectReceipts.push({ kind: d.kind, status: 'compensation-failed', error: String(e.message || e) }); }
          }
          status = 'failed-after-commit';
          break;
        }
      }
      outputs.return = effectReceipts;
      receipt('return', status === 'committed' ? 'passed' : 'failed', { effects: staged.length });

      // Transcend: the carry for the next cycle. Feather after Return stops here.
      let carry = carryIn;
      if (status === 'committed' && !feather()) {
        try {
          carry = plain(await phases.transcend(ctx, outputs), 'transcend');
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

      const prev = head ? digest(head) : root;
      head = Object.freeze({
        schema: MOBIUS_SCHEMA, root, cycle: n, face, prev, worker,
        center: WITHNESS, status,
        receipts: digest(receipts),
        carry, carry_digest: digest(carry),
      });
      history.push(carry);
      const result = finish(status);
      return Object.freeze({ ...result, checkpoint: head });
    }

    return Object.freeze({
      cycle: n,
      // The four cores. Each returns a finished result if the cycle ended early.
      intake: () => pre(['perceive', 'compress']),
      trial: () => pre(['release', 'verify']),
      judgment: () => pre(['integrate', 'choose']),
      passage,
    });
  }

  async function cycle(phases) {
    const c = begin(phases);
    return (await c.intake()) || (await c.trial()) || (await c.judgment()) || c.passage();
  }

  // Möbius fixed point: carry equals the carry two cycles back (τ0 = seeds).
  function stable() {
    const k = history.length - 1;
    return k >= 2 && digest(history[k]) === digest(history[k - 2]);
  }

  async function run(phases, { cycles = 1, until = null } = {}) {
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 10000) throw new RangeError('cycles must be 1..10000');
    const results = [];
    for (let i = 0; i < cycles; i++) {
      const r = await cycle(phases);
      results.push(r);
      if (!['committed'].includes(r.status)) break;
      if (until === 'stable' && stable()) return { status: 'converged', results, head };
      if (typeof until === 'function' && until(r)) return { status: 'converged', results, head };
    }
    return { status: results.at(-1).status, results, head };
  }

  return Object.freeze({ root, begin, cycle, run, get head() { return head; }, stable,
    get system() { return options.system; } });
}

function verifyChain(root, checkpoints) {
  let expected = root;
  for (const [i, cp] of checkpoints.entries()) {
    if (cp.root !== root || cp.prev !== expected || cp.face !== faceOf(cp.cycle)) return { ok: false, at: i + 1 };
    if (i > 0 && cp.cycle !== checkpoints[i - 1].cycle + 1) return { ok: false, at: i + 1 };
    expected = digest(cp);
  }
  return { ok: true, length: checkpoints.length, head: expected };
}

// ---- Quad core ------------------------------------------------------------
// Four cores, two phases each, Withness at the center. A lineage's cycles are
// strictly sequential (each needs the previous carry), so the quad core gains
// throughput by pipelining *different* lineages: up to four cycles in flight,
// one per core. Each core works one item at a time; Core IV serializes every
// commit, and Withness keeps the ledger of what ran where, in order.
const CORES = Object.freeze([
  Object.freeze({ core: 'I', name: 'intake', phases: ['perceive', 'compress'] }),
  Object.freeze({ core: 'II', name: 'trial', phases: ['release', 'verify'] }),
  Object.freeze({ core: 'III', name: 'judgment', phases: ['integrate', 'choose'] }),
  Object.freeze({ core: 'IV', name: 'passage', phases: ['return', 'transcend'] }),
]);

function runQuadCore(jobs = []) {
  const state = jobs.map((job, i) => {
    if (!job?.lineage || !job.phases) throw new TypeError('Each job needs a lineage and its phases.');
    return { i, lineage: job.lineage, phases: job.phases, cycles: job.cycles ?? 1, until: job.until ?? null,
      results: [], status: null };
  });
  const queues = [[], [], [], []];
  const busy = [false, false, false, false];
  const ledger = [];
  let seq = 0; let peak = 0;
  return new Promise((resolve, reject) => {
    const settle = () => {
      if (busy.some(Boolean) || queues.some(q => q.length)) return;
      resolve(Object.freeze({
        schema: MOBIUS_SCHEMA + '+quad', center: WITHNESS, cores: CORES, peak_concurrency: peak,
        ledger: Object.freeze(ledger),
        lineages: state.map(s => Object.freeze({ system: s.lineage.system, root: s.lineage.root,
          status: s.status, results: s.results, head: s.lineage.head })),
      }));
    };
    const enter = (job) => {
      try { queues[0].push({ job, cyc: job.lineage.begin(job.phases) }); }
      catch (error) { job.status = 'refused'; job.results.push({ status: 'refused', reason: [String(error.message)] }); }
    };
    const pump = () => {
      for (let k = 0; k < 4; k++) {
        if (busy[k] || !queues[k].length) continue;
        const item = queues[k].shift();
        busy[k] = true;
        peak = Math.max(peak, busy.filter(Boolean).length);
        const started = seq++;
        item.cyc[CORES[k].name]().then((r) => {
          ledger.push(Object.freeze({ seq: started, core: CORES[k].core, system: item.job.lineage.system,
            cycle: item.cyc.cycle, ended: Boolean(r) }));
          busy[k] = false;
          if (!r) { queues[k + 1].push(item); }
          else {
            const job = item.job;
            job.results.push(r);
            const more = r.status === 'committed' && job.results.length < job.cycles;
            const converged = r.status === 'committed' && ((job.until === 'stable' && job.lineage.stable())
              || (typeof job.until === 'function' && job.until(r)));
            if (converged) job.status = 'converged';
            else if (more) enter(job);
            else job.status = r.status;
          }
          pump(); settle();
        }, (error) => { busy[k] = false; reject(error); });
      }
    };
    for (const job of state) enter(job);
    pump(); settle();
  });
}

module.exports = { MOBIUS_SCHEMA, PHASES, WITHNESS, CORES, faceOf, angleOf, lineageRoot, createLineage,
  verifyChain, runQuadCore, FeatherStop };
