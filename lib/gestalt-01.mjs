// GESTALT-01 · stage D apparatus (deterministic quads).
// Pre-registration: docs/wayglass/gestalt-01/PREREGISTRATION.json (frozen at b912aaf,
// committed before this file existed). Every protocol runs on the same Möbius engine
// and the same kernel-sovereign crossing, with equal rounds, packet budget, compute,
// time and retries, and identical private information. Only the transformation at
// the twist differs.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const M = require('./wayglass-mobius.cjs');
const X = require('./wayglass-crossing.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

export const POSITIONS = 6;
export const BASE = 5;
export const SPACE = BASE ** POSITIONS;
export const PROTOCOLS = Object.freeze(['mobius', 'bus', 'bus_transformed', 'mobius_noflip', 'solo']);
// D3 (PREREGISTRATION-D3.json): mobius_half is two-way at one-way's byte budget.
export const PROTOCOLS_D3 = Object.freeze([...PROTOCOLS, 'mobius_half']);
// Amendment 1: the exchanged/carried mask is pairwise — for each of the 15 position
// pairs, the 25-bit set of value combinations present. 375 bits = 47 raw bytes.
export const PAIRS = Object.freeze([].concat(...Array.from({ length: POSITIONS }, (_, i) => Array.from({ length: POSITIONS - i - 1 }, (_, k) => [i, i + k + 1]))));
const FULL = 2 ** (BASE * BASE) - 1;
export const PAYLOAD_BYTES = Math.ceil(PAIRS.length * BASE * BASE / 8);
// D3: the two halves of the pair mask (8 pairs = 25 raw bytes, 7 pairs = 22 raw bytes).
export const HALVES = Object.freeze([Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), Object.freeze([8, 9, 10, 11, 12, 13, 14])]);
export const partBytes = n => Math.ceil(n * BASE * BASE / 8);
const packetBytes = p => (p.body.part ? partBytes(p.body.pairs.length) : PAYLOAD_BYTES);

export function preregistration(file = 'PREREGISTRATION.json') {
  const path = new URL(`../docs/wayglass/gestalt-01/${file}`, import.meta.url);
  const text = readFileSync(path, 'utf8');
  const prereg = JSON.parse(text);
  if (prereg.frozen !== true) throw new Error('GESTALT-01 refuses to run against an unfrozen pre-registration');
  return { prereg, sha256: createHash('sha256').update(text).digest('hex') };
}

// ---- Deterministic tasks --------------------------------------------------------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ALL = Array.from({ length: SPACE }, (_, n) => { const a = []; for (let i = 0; i < POSITIONS; i++) { a.push(n % BASE); n = Math.floor(n / BASE); } return a; });
const sat = (c, a) => c.positions.reduce((s, i) => s + a[i], 0) % c.mod === c.residue;

export function makeTask(seed, { subset_sizes, moduli, k = 5 }) {
  const r = rng(seed);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  for (let attempt = 0; attempt < 2000; attempt++) {
    const secret = Array.from({ length: POSITIONS }, () => Math.floor(r() * BASE));
    const constraint = (truthful) => {
      const size = pick(subset_sizes);
      const positions = [...new Set(Array.from({ length: size * 3 }, () => Math.floor(r() * POSITIONS)))].slice(0, size).sort();
      const mod = pick(moduli);
      const truth = positions.reduce((s, i) => s + secret[i], 0) % mod;
      return { positions, mod, residue: truthful ? truth : (truth + 1 + Math.floor(r() * (mod - 1))) % mod };
    };
    // k private constraints per quad, exactly one false (k = 5 reproduces stage D exactly).
    const quad = () => { const cs = Array.from({ length: k - 1 }, () => constraint(true)); const f = Math.floor(r() * k); cs.splice(f, 0, constraint(false)); return { constraints: cs, falseIndex: f }; };
    const A = quad(); const B = quad();
    const truths = [...A.constraints.filter((_, i) => i !== A.falseIndex), ...B.constraints.filter((_, i) => i !== B.falseIndex)];
    const joint = ALL.filter(a => truths.every(c => sat(c, a)));
    if (joint.length !== 1) continue;
    const tolerant = q => ALL.filter(a => q.constraints.filter(c => !sat(c, a)).length <= 1);
    if (tolerant(A).length <= 1 || tolerant(B).length <= 1) continue;
    return { seed, secret, A, B, attempts: attempt + 1 };
  }
  return null;
}

// ---- Quads ------------------------------------------------------------------------
const bit = (a, [i, j]) => 2 ** (a[i] * BASE + a[j]);
const maskOf = cands => PAIRS.map(pr => { const seen = new Set(cands.map(a => a[pr[0]] * BASE + a[pr[1]])); let m = 0; for (const v of seen) m += 2 ** v; return m; });
const inMask = (a, mask) => PAIRS.every((pr, k) => Math.floor(mask[k] / bit(a, pr)) % 2 === 1);
// A received body: a full mask (every protocol through D2) or, for mobius_half, a part.
const inBody = (a, body) => (body.part
  ? body.pairs.every((k, j) => Math.floor(body.part[j] / bit(a, PAIRS[k])) % 2 === 1)
  : inMask(a, body.mask));

// D3 stratum, from the task alone (an oracle that knows which constraints are false;
// no quad sees it): does tolerating one own error leave a quad ambiguous even with
// perfect knowledge of the peer's true constraints?
export function stratum(task) {
  const ambiguity = ['A', 'B'].map((q, i) => {
    const own = task[q]; const peer = task[['A', 'B'][1 - i]];
    const peerTruths = peer.constraints.filter((_, j) => j !== peer.falseIndex);
    return ALL.filter(a => peerTruths.every(c => sat(c, a)) && own.constraints.filter(c => !sat(c, a)).length <= 1).length;
  });
  return { S: ambiguity.some(n => n > 1), ambiguity };
}

// One quad's Möbius phases for a protocol. Private constraints stay in this closure.
function quadPhases({ name, priv, protocol, peerRoot, ctxRef, channel, authority, cap, outbox, history }) {
  const strict = protocol === 'bus';
  const reverify = protocol === 'mobius' || protocol === 'mobius_noflip' || protocol === 'mobius_half';
  const sends = protocol !== 'solo' && !(protocol === 'mobius_noflip' && name === 'B');
  let work = null;
  return {
    async perceive(ctx) {
      const prevCrossing = ctx.carried.round > 0 ? `${ctxRef.trial}:${protocol}:${ctx.carried.round - 1}` : null;
      const inbox = prevCrossing ? channel.inbox(prevCrossing, ctx.root) : [];
      work = { inbox, dropped: [...ctx.carried.dropped] };
      ctx.possibility('gathered', inbox.length);
      return { round: ctx.carried.round, inbox: inbox.map(p => p.digest) };
    },
    async compress(ctx) {
      const active = priv.constraints.map((c, i) => ({ c, i })).filter(x => !work.dropped.includes(x.i));
      const tolerance = strict ? 0 : (work.dropped.length ? 0 : 1);
      const incoming = work.inbox.map(p => p.body);
      work.cands = ALL.filter(a => inMask(a, ctx.carried.mask) && incoming.every(b => inBody(a, b))
        && active.filter(x => !sat(x.c, a)).length <= tolerance);
      ctx.possibility('generated', Math.min(work.cands.length, 1e6));
      return { candidates: work.cands.length };
    },
    async release() { return { alternatives: work.cands.length }; },
    async verify(ctx) {
      // Integrity of what crossed: attributed to the peer, addressed to me, digest intact.
      return work.inbox.map(p => {
        const { digest: d, ...payload } = p;
        return { ok: p.from === peerRoot && p.to === ctx.root && d === digest(payload), reason: `packet ${p.digest.slice(5, 17)} attributed and intact` };
      }).concat([{ ok: Number.isInteger(ctx.carried.round), reason: 'carried round re-verified' }]);
    },
    async integrate(ctx) {
      // Möbius re-verification: test my own constraints against what crossed.
      if (reverify && work.inbox.length && !work.dropped.length) {
        const informed = ALL.filter(a => inMask(a, ctx.carried.mask) && work.inbox.every(p => inBody(a, p.body)));
        const impossible = priv.constraints.map((c, i) => ({ c, i })).filter(x => !informed.some(a => sat(x.c, a)));
        if (impossible.length === 1) {
          work.dropped.push(impossible[0].i);
          const remaining = priv.constraints.filter((_, i) => !work.dropped.includes(i));
          work.cands = informed.filter(a => remaining.every(c => sat(c, a)));
        }
      }
      const consistent = priv.constraints.filter((c, i) => !work.dropped.includes(i)).length / priv.constraints.length;
      ctx.harmony(consistent);
      return { candidates: work.cands.length, dropped: work.dropped };
    },
    async choose(ctx) {
      const mask = work.cands.length ? maskOf(work.cands) : ctx.carried.mask;
      work.mask = mask;
      if (sends) {
        let body = { mask };
        if (protocol === 'mobius_half') {
          const pairs = HALVES[(ctx.carried.round + (name === 'B' ? 1 : 0)) % 2];
          body = { pairs: [...pairs], part: pairs.map(k => mask[k]) };
        }
        const packet = X.makePacket({ crossing: ctxRef.crossing, round: ctx.carried.round, from: ctx.root, participant: name, to: peerRoot, body });
        if (PAYLOAD_BYTES > 48 || mask.length !== PAIRS.length || packetBytes(packet) > 48) throw new Error('packet over the pre-registered 48-byte budget');
        outbox.packets.push(packet);
        ctx.stage(X.fenced({ kind: 'publish', describe: { to: 'peer', crossing: ctxRef.crossing }, idempotent: true,
          apply: async () => channel.publish(packet), undo: async () => channel.retract(packet) }, cap, authority));
      }
      history.push({ quad: name, round: ctx.carried.round, candidates: work.cands.length, dropped: [...work.dropped],
        truth_kept: work.cands.some(a => a.join() === ctxRef.secret.join()) });
      return { mask, sent: sends };
    },
    async transcend(ctx) {
      return { mask: work.mask, dropped: work.dropped, round: ctx.carried.round + 1 };
    },
    result: () => work,
  };
}

// ---- One trial ------------------------------------------------------------------
export async function runTrial(task, protocol, { rounds = 4, trialId = `t${task.seed}` } = {}) {
  const authority = X.createAuthority();
  const channel = X.createChannel();
  const log = X.createCoordinatorLog();
  const ctxRef = { trial: trialId, secret: task.secret, crossing: null };
  const seeds = { mask: Array(PAIRS.length).fill(FULL), dropped: [], round: 0 };
  const lineages = ['A', 'B'].map(n => M.createLineage({ system: `gestalt-01/${protocol}/${trialId}/${n}`, participant: n, seeds }));
  const history = [];
  const quads = ['A', 'B'].map((n, i) => {
    const outbox = { packets: [] };
    const cap = authority.grant(n);
    const phases = quadPhases({ name: n, priv: task[n], protocol, peerRoot: lineages[1 - i].root, ctxRef, channel, authority, cap, outbox, history });
    return { lineage: lineages[i], phases, participant: n, cap, outbox };
  });
  let integrity = { valid: true, violations: [] };
  const checkpoints = [[], []];
  for (let r = 0; r < rounds; r++) {
    ctxRef.crossing = `${trialId}:${protocol}:${r}`;
    const out = await X.runCrossing({ id: ctxRef.crossing, quads, log, authority });
    out.results.forEach((res, i) => res.checkpoint && checkpoints[i].push(res.checkpoint));
    if (out.decision !== 'commit' || out.outcome !== 'done') { integrity = { valid: false, violations: [`round ${r}: ${out.decision} ${out.outcome ?? ''} ${(out.reasons || []).join('; ')}`] }; break; }
  }
  // Continuity contract checks (any violation invalidates the trial).
  const rows = log.dump();
  for (const id of new Set(rows.map(r => r.id))) {
    const ids = rows.filter(r => r.id === id);
    const decidedAt = ids.findIndex(r => r.state === 'decided' && r.decision === 'commit');
    if (ids.some((r, i) => r.state === 'applied' && (decidedAt < 0 || i < decidedAt))) integrity.violations.push(`${id}: commit without durable decision`);
  }
  for (const p of channel.all()) {
    const sender = quads.find(q => q.lineage.root === p.from);
    if (!sender || sender.participant !== p.participant) integrity.violations.push(`identity substitution in ${p.digest}`);
  }
  quads.forEach((q, i) => {
    if (!M.verifyChain(q.lineage.root, checkpoints[i]).ok) integrity.violations.push(`quad ${q.participant}: continuity chain broken`);
    if (q.lineage.head && q.lineage.head.root !== q.lineage.root) integrity.violations.push('identity drift');
  });
  // Amendment 2: each quad proposes on its own; the harness compares, never combines.
  const key = x => x.join();
  const proposals = quads.map(q => { const c = q.phases.result()?.cands ?? []; return c.length === 1 ? c[0] : null; });
  const [a, b] = proposals;
  const answer = a && b && key(a) === key(b) ? a : null;
  const provenance = answer ? ['A', 'B'] : proposals.map((p, i) => (p ? ['A', 'B'][i] + ':alone' : null)).filter(Boolean);
  // Fabricated provenance: a joint label on an answer either quad did not itself propose.
  if (answer && !(key(a) === key(answer) && key(b) === key(answer))) integrity.violations.push('fabricated joint provenance');
  integrity.valid = integrity.valid && integrity.violations.length === 0;
  const correct = Boolean(answer) && key(answer) === key(task.secret);
  const dropsA = quads[0].phases.result()?.dropped ?? []; const dropsB = quads[1].phases.result()?.dropped ?? [];
  const caught = [dropsA.filter(i => i === task.A.falseIndex).length, dropsB.filter(i => i === task.B.falseIndex).length].reduce((x, y) => x + y, 0);
  const introduced = dropsA.filter(i => i !== task.A.falseIndex).length + dropsB.filter(i => i !== task.B.falseIndex).length;
  const sizes = quads.map(q => q.phases.result()?.cands?.length ?? SPACE);
  const final = Math.max(1, Math.min(...sizes.map(n => n || SPACE)));
  return {
    trial: trialId, seed: task.seed, protocol, success: correct && integrity.valid, correct, integrity,
    joint: Boolean(answer), provenance, proposals: proposals.map(p => (p ? p.join('') : null)),
    bytes: channel.all().reduce((n, p) => n + packetBytes(p), 0), // raw payload bytes (amendment 1)
    a_correct: proposals[0] ? key(proposals[0]) === key(task.secret) : false,
    b_correct: proposals[1] ? key(proposals[1]) === key(task.secret) : false,
    errors_caught: caught, errors_introduced: introduced,
    bits_retained: Math.log2(SPACE / Math.max(1, final)),
    truth_lost: history.some(h => !h.truth_kept),
    identity_drift: integrity.violations.includes('identity drift') ? 1 : 0,
    history,
    spirals: quads.map(q => q.lineage.head?.spiral ? { ln_r: q.lineage.head.spiral.ln_r, chirality: q.lineage.head.spiral.chirality } : null),
    growth: quads.reduce((s, q) => s + (q.lineage.head?.spiral?.ln_r ?? 0), 0) / quads.length,
  };
}

// ---- Analysis ---------------------------------------------------------------------
export function bootstrapCI(diffs, { resamples = 2000, seed = 7 } = {}) {
  const r = rng(seed); const n = diffs.length; const means = [];
  for (let k = 0; k < resamples; k++) { let s = 0; for (let i = 0; i < n; i++) s += diffs[Math.floor(r() * n)]; means.push(s / n); }
  means.sort((x, y) => x - y);
  const mean = diffs.reduce((s, x) => s + x, 0) / n;
  return { mean, lo: means[Math.floor(0.025 * resamples)], hi: means[Math.ceil(0.975 * resamples) - 1], n };
}

// Spearman rank correlation with average ranks for ties (exploratory measures E1/E2).
export function spearman(xs, ys) {
  const rank = v => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = Array(v.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let t = i; t <= j; t++) r[idx[t][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const a = rank(xs); const b = rank(ys); const n = xs.length; const ma = a.reduce((s, x) => s + x, 0) / n; const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da === 0 || db === 0 ? null : num / Math.sqrt(da * db);
}

// D2 calibration: bus_transformed only, grid in registered order, first config in [0.30, 0.70].
export async function calibrate({ preregFile = 'PREREGISTRATION-D2.json', onTrial = () => {} } = {}) {
  const { prereg, sha256 } = preregistration(preregFile);
  const c = prereg.calibration; const rows = [];
  for (const cfg of c.grid_in_order) {
    const tasks = []; for (let s = c.seeds[0]; s <= c.seeds[1]; s++) { const t = makeTask(s, { ...c.task_spec, k: cfg.k }); if (t) tasks.push(t); }
    let ok = 0; for (const t of tasks) { const r = await runTrial(t, 'bus_transformed', { rounds: cfg.rounds, trialId: `cal-${cfg.k}-${cfg.rounds}-${t.seed}` }); onTrial(r); if (r.success) ok += 1; }
    rows.push({ ...cfg, tasks: tasks.length, success: tasks.length ? ok / tasks.length : null });
  }
  const inBand = rows.find(r => r.success !== null && r.success >= 0.30 && r.success <= 0.70);
  const closest = [...rows].filter(r => r.success !== null).sort((a, b) => Math.abs(a.success - 0.5) - Math.abs(b.success - 0.5))[0];
  const selected = inBand || closest;
  return { schema: 'wayglass.gestalt-01.calibration/v1', preregistration_sha256: sha256, rule_satisfied: Boolean(inBand), grid: rows,
    selected: { k: selected.k, rounds: selected.rounds, success: selected.success } };
}

export async function runExperiment({ sets, rounds = 4, k = 5, limit = Infinity, preregFile = 'PREREGISTRATION.json', protocols = PROTOCOLS, keep = null, onTrial = () => {} } = {}) {
  const PROTOCOLS = protocols; // D2 and earlier: the registered five, so their digests reproduce
  const { prereg, sha256 } = preregistration(preregFile);
  const out = { schema: 'wayglass.gestalt-01.results/v1', preregistration_sha256: sha256, stage: prereg.stage, sets: {} };
  out.config = { k, rounds };
  for (const [name, spec] of Object.entries(sets || prereg.task_family?.sets || prereg.main.sets)) {
    const tasks = [];
    for (let s = spec.seeds[0]; s <= spec.seeds[1] && tasks.length < limit; s++) { const t = makeTask(s, { ...spec, k }); if (t) tasks.push(t); }
    const trials = {};
    for (const p of PROTOCOLS) { trials[p] = []; for (const t of tasks) { const r = await runTrial(t, p, { rounds, trialId: `${name}-${t.seed}` }); trials[p].push(r); onTrial(r); } }
    const P = Object.fromEntries(PROTOCOLS.map(p => [p, trials[p].filter(t => t.success).length / tasks.length]));
    const G = {};
    for (const base of ['bus', 'bus_transformed', 'mobius_noflip', 'solo']) {
      G[base] = bootstrapCI(tasks.map((_, i) => Number(trials.mobius[i].success) - Number(trials[base][i].success)));
    }
    const summary = p => {
      const ts = trials[p]; const n = ts.length;
      const avg = f => ts.reduce((s, t) => s + f(t), 0) / n;
      return { P: P[p], invalid: ts.filter(t => !t.integrity.valid).length, correct: avg(t => +t.correct), joint: avg(t => +t.joint),
        bytes: avg(t => t.bytes), errors_caught: avg(t => t.errors_caught), errors_introduced: avg(t => t.errors_introduced),
        bits_retained: avg(t => t.bits_retained), truth_lost: avg(t => +t.truth_lost), identity_drift: avg(t => t.identity_drift),
        development: Array.from({ length: rounds }, (_, r) => {
          const hs = ts.flatMap(t => t.history.filter(h => h.round === r));
          return { round: r, mean_candidates: hs.reduce((a, h) => a + h.candidates, 0) / Math.max(1, hs.length),
            truth_kept: hs.filter(h => h.truth_kept).length / Math.max(1, hs.length) };
        }),
        growth_mean: avg(t => t.growth),
        E1_growth_vs_success: spearman(ts.map(t => t.growth), ts.map(t => +t.success)),
        E2_growth_vs_truth_lost: spearman(ts.map(t => t.growth), ts.map(t => +t.truth_lost)) };
    };
    if (keep) keep[name] = { tasks, trials };
    out.sets[name] = { tasks: tasks.length, generation_attempts: tasks.reduce((s, t) => s + t.attempts, 0),
      protocols: Object.fromEntries(PROTOCOLS.map(p => [p, summary(p)])), G,
      trials_digest: digest(PROTOCOLS.map(p => trials[p].map(t => [t.seed, t.success, t.bytes]))) };
  }
  const supported = (set, base) => out.sets[set]?.G[base]?.lo > 0;
  out.hypotheses = { H1: supported('held_out', 'bus'), H2: supported('held_out', 'bus_transformed'), H3: supported('held_out', 'mobius_noflip'), H4: supported('shifted', 'bus') };
  return out;
}

// ---- D3 analysis (PREREGISTRATION-D3.json) --------------------------------------------
const POWER_MIN = 40;
const gOf = (pairs) => (pairs.length ? bootstrapCI(pairs) : null);
export function analyzeD3(out, keep) {
  const d3 = {};
  for (const [name, { tasks, trials }] of Object.entries(keep)) {
    const labels = tasks.map(stratum);
    const idx = { S: [], notS: [] };
    labels.forEach((l, i) => idx[l.S ? 'S' : 'notS'].push(i));
    const diff = (a, b, f = t => +t.success) => ids => ids.map(i => f(trials[a][i]) - f(trials[b][i]));
    const all = tasks.map((_, i) => i);
    const byStratum = Object.fromEntries(Object.entries(idx).map(([st, ids]) => [st, {
      tasks: ids.length,
      G_mobius_vs_bus_transformed: gOf(diff('mobius', 'bus_transformed')(ids)),
      P: Object.fromEntries(Object.keys(trials).map(p => [p, ids.length ? ids.filter(i => trials[p][i].success).length / ids.length : null])),
      mobius_dropped_false: ids.length ? ids.filter(i => trials.mobius[i].errors_caught > 0).length / ids.length : null,
      errors: Object.fromEntries(['mobius', 'mobius_half'].map(p => [p, {
        caught: ids.length ? ids.reduce((s, i) => s + trials[p][i].errors_caught, 0) / ids.length : null,
        introduced: ids.length ? ids.reduce((s, i) => s + trials[p][i].errors_introduced, 0) / ids.length : null }])),
    }]));
    d3[name] = {
      strata: byStratum,
      G_mobius_half_vs_noflip: gOf(diff('mobius_half', 'mobius_noflip')(all)),
      B_correct_mobius_half_vs_noflip: gOf(diff('mobius_half', 'mobius_noflip', t => +t.b_correct)(all)),
      B_correct: Object.fromEntries(Object.keys(trials).map(p => [p, trials[p].filter(t => t.b_correct).length / tasks.length])),
      bytes_per_round: Object.fromEntries(Object.keys(trials).map(p => [p, out.sets[name].protocols[p].bytes / out.config.rounds])),
      labels_digest: digest(labels.map((l, i) => [tasks[i].seed, l.S, l.ambiguity])),
    };
  }
  const st = (set, s) => d3[set]?.strata[s];
  const pos = g => (g ? g.lo > 0 : null);
  const powered = (set, s) => (st(set, s)?.tasks ?? 0) >= POWER_MIN;
  const verdict = (set, s, test) => (powered(set, s) ? test(st(set, s).G_mobius_vs_bus_transformed) : 'underpowered, not tested');
  const H = {
    H5: verdict('held_out', 'S', pos),
    H6: verdict('held_out', 'notS', g => g.lo <= 0 && g.hi >= 0),
    H7: pos(d3.held_out?.G_mobius_half_vs_noflip),
    H7b: pos(d3.held_out?.B_correct_mobius_half_vs_noflip),
    H8: pos(out.sets.held_out?.G.bus),
    H9: verdict('shifted', 'S', pos),
  };
  return { d3, hypotheses: H };
}
