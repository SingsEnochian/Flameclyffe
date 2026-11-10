// GESTALT-01 D3 · post-hoc replica of the mobius quad logic, shared by the diagnostics.
// Validated field by field against the apparatus in gestalt-01-d3-crossings.mjs.
import { makeTask, stratum, runTrial, PAIRS, BASE, POSITIONS, SPACE } from '../lib/gestalt-01.mjs';

export const ALL = Array.from({ length: SPACE }, (_, n) => { const a = []; for (let i = 0; i < POSITIONS; i++) { a.push(n % BASE); n = Math.floor(n / BASE); } return a; });
const FULL = 2 ** (BASE * BASE) - 1;
export const sat = (c, a) => c.positions.reduce((s, i) => s + a[i], 0) % c.mod === c.residue;
const bit = (a, [i, j]) => 2 ** (a[i] * BASE + a[j]);
const maskOf = cands => PAIRS.map(pr => { const seen = new Set(cands.map(a => a[pr[0]] * BASE + a[pr[1]])); let m = 0; for (const v of seen) m += 2 ** v; return m; });
const inMask = (a, mask) => PAIRS.every((pr, k) => Math.floor(mask[k] / bit(a, pr)) % 2 === 1);
export const key = a => a.join();
const { digest } = (await import('node:module')).createRequire(import.meta.url)('../lib/wyrdrune/canonical.cjs');
export const spec = { subset_sizes: [2, 3], moduli: [2, 3, 4, 5], k: 7 };
export const ROUNDS = 4;
export const NAMES = ['A', 'B'];

// policy: 'impossibility' (the apparatus), 'on-encoded' (drop f when L2 holds),
// 'on-latent' (drop f when L0 holds). oracle: quads whose false constraint is removed up front.
// tolerance: 'at-most' (the apparatus: ≤ 1 own violation before a drop) or 'exactly' (the
// task's own rule: exactly one own constraint is false, so exactly one violation before a drop).
// rounds: the round budget (registered: 4). channel: 'pairwise' (the apparatus) or 'exact' (the
// counterfactual of sending the exact candidate set, to measure what the pairwise encoding loses).
const admits = (m, a) => (m.exact ? m.exact.has(key(a)) : inMask(a, m.mask));
export function replica(task, { oracle = [], policy = 'impossibility', tolerance = 'at-most', rounds: R = ROUNDS, channel = 'pairwise' } = {}) {
  const Q = NAMES.map(n => {
    const own = task[n]; const o = oracle.includes(n);
    return { n, constraints: o ? own.constraints.filter((_, i) => i !== own.falseIndex) : own.constraints, falseIndex: o ? -1 : own.falseIndex,
      truths: own.constraints.filter((_, i) => i !== own.falseIndex), carried: { mask: Array(PAIRS.length).fill(FULL), dropped: o ? ['oracle'] : [], round: 0 },
      cands: null, sent: null };
  });
  const rounds = [];
  for (let r = 0; r < R; r++) {
    const prev = Q.map(q => ({ cands: q.cands, sent: q.sent }));
    const rows = Q.map((q, i) => {
      const P = Q[1 - i]; const pPrev = prev[1 - i];
      const inbox = r > 0 ? [pPrev.sent] : [];
      const dropped = [...q.carried.dropped];
      const activeIdx = q.constraints.map((_, j) => j).filter(j => !dropped.includes(j));
      const tol = dropped.length ? 0 : 1;
      const fits = v => (tolerance === 'exactly' && tol === 1 ? v === 1 : v <= tol);
      let cands = ALL.filter(a => inMask(a, q.carried.mask) && inbox.every(m => admits(m, a)) && fits(activeIdx.filter(j => !sat(q.constraints[j], a)).length));
      const informed = ALL.filter(a => inMask(a, q.carried.mask) && inbox.every(m => admits(m, a))
        && (tolerance !== 'exactly' || dropped.length || q.constraints.filter(c => !sat(c, a)).length === 1));
      const impossible = q.constraints.map((_, j) => j).filter(j => !informed.some(a => sat(q.constraints[j], a)));
      const f = q.falseIndex >= 0 ? q.constraints[q.falseIndex] : null;
      const rulesOut = set => (f ? !set.some(a => sat(f, a)) : null);
      const links = r > 0 && f && !dropped.length ? {
        L0: rulesOut(ALL.filter(a => inMask(a, q.carried.mask) && P.truths.every(c => sat(c, a)))),
        L1: rulesOut(pPrev.cands.filter(a => inMask(a, q.carried.mask))),
        L2: rulesOut(informed),
        L3: true, // replica channel is exact; the apparatus side is checked in fidelity
      } : null;
      let drop = null;
      if (inbox.length && !dropped.length) {
        if (policy === 'impossibility' && impossible.length === 1) drop = impossible[0];
        if (policy === 'on-encoded' && links?.L2) drop = q.falseIndex;
        if (policy === 'on-latent' && links?.L0) drop = q.falseIndex;
      }
      if (drop !== null) {
        dropped.push(drop);
        const remaining = q.constraints.filter((_, j) => !dropped.includes(j));
        cands = informed.filter(a => remaining.every(c => sat(c, a)));
      }
      if (links) links.L4 = drop !== null && drop === q.falseIndex;
      const mask = cands.length ? maskOf(cands) : q.carried.mask;
      return { quad: q.n, round: r, cands, candsDigest: digest(cands.map(a => a.join(''))), mask, dropped, impossible: impossible.length, links,
        inboxMask: inbox[0]?.mask ?? null, carried_in: { mask: [...q.carried.mask], dropped: [...q.carried.dropped], round: q.carried.round } };
    });
    rows.forEach((row, i) => { Q[i].cands = row.cands; Q[i].sent = { mask: row.mask, exact: channel === 'exact' ? new Set(row.cands.map(key)) : null }; Q[i].carried = { mask: row.mask, dropped: row.dropped, round: r + 1 }; });
    rounds.push(rows);
  }
  const final = rounds.at(-1).map(r => r.cands);
  const wrongDrops = Q.reduce((n, q) => n + q.carried.dropped.filter(d => d !== 'oracle' && d !== q.falseIndex).length, 0);
  const truthLost = rounds.some(r => r.some(x => !x.cands.some(a => key(a) === key(task.secret))));
  const solved = final.every(c => c.length === 1) && key(final[0][0]) === key(final[1][0]) && key(final[0][0]) === key(task.secret);
  return { rounds, solved, wrongDrops, truthLost, carries: Q.map(q => q.carried), drops: Q.map(q => q.carried.dropped.filter(d => d !== 'oracle')), falseIndex: Q.map(q => q.falseIndex) };
}


// The task's own rule is that each quad holds exactly one false constraint. These are the
// worlds consistent with BOTH quads' private information under that rule: the true ceiling
// for any protocol that does not guess.
export const pooledWorlds = t => ALL.filter(a => t.A.constraints.filter(c => !sat(c, a)).length === 1 && t.B.constraints.filter(c => !sat(c, a)).length === 1);
