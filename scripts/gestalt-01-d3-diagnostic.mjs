// GESTALT-01 D3 · POST-HOC diagnostic (not pre-registered; no decision rule).
// Asked after H5 failed: in stratum S, is the limit the pairwise channel or the
// re-verification rule? Ceiling = both quads perfectly corrected, exchanging pairwise
// masks of their true-constraint sets to a fixed point.
import { writeFileSync } from 'node:fs';
import { makeTask, stratum, runTrial, PAIRS, BASE, POSITIONS, SPACE } from '../lib/gestalt-01.mjs';
const ALL = Array.from({ length: SPACE }, (_, n) => { const a = []; for (let i = 0; i < POSITIONS; i++) { a.push(n % BASE); n = Math.floor(n / BASE); } return a; });
const sat = (c, a) => c.positions.reduce((s, i) => s + a[i], 0) % c.mod === c.residue;
const maskOf = cands => PAIRS.map(([i, j]) => new Set(cands.map(a => a[i] * BASE + a[j])));
const inM = (a, m) => PAIRS.every(([i, j], k) => m[k].has(a[i] * BASE + a[j]));
const spec = { subset_sizes: [2, 3], moduli: [2, 3, 4, 5], k: 7 };
const rows = { S: [], notS: [] };
for (let s = 6001; s <= 6400; s++) {
  const t = makeTask(s, spec); if (!t) continue;
  const st = stratum(t).S ? 'S' : 'notS';
  const truths = q => t[q].constraints.filter((_, i) => i !== t[q].falseIndex);
  // Ceiling: both quads perfectly corrected, exchange pairwise masks of their true-constraint sets, iterate to a fixed point.
  let A = ALL.filter(a => truths('A').every(c => sat(c, a))), B = ALL.filter(a => truths('B').every(c => sat(c, a)));
  for (let r = 0; r < 8; r++) { const mA = maskOf(A), mB = maskOf(B); A = A.filter(a => inM(a, mB)); B = B.filter(a => inM(a, mA)); }
  const ceiling = A.length === 1 && B.length === 1;
  const m = await runTrial(t, 'mobius', { rounds: 4, trialId: 'diag-' + s });
  const dropsFalse = m.errors_caught;
  rows[st].push({ ceiling, both: dropsFalse === 2, final: m.history.filter(h => h.round === 3).map(h => h.candidates) });
}
const summary = {};
for (const [st, r] of Object.entries(rows)) {
  const n = r.length; const pct = x => (100 * x / n).toFixed(1) + '%';
  summary[st] = { tasks: n, ceiling_solvable: r.filter(x => x.ceiling).length / n, mobius_corrected_both: r.filter(x => x.both).length / n,
    mean_final_candidates: r.flatMap(x => x.final).reduce((a, b) => a + b, 0) / (2 * n) };
  console.log(`${st}: n=${n} · perfect-correction pairwise ceiling solvable ${pct(r.filter(x => x.ceiling).length)} · mobius corrected both quads ${pct(r.filter(x => x.both).length)} · mean final candidates ${(r.flatMap(x => x.final).reduce((a, b) => a + b, 0) / (2 * n)).toFixed(1)}`);
}
writeFileSync(new URL('../docs/wayglass/gestalt-01/DIAGNOSTIC-D3-posthoc.json', import.meta.url), JSON.stringify({
  schema: 'wayglass.gestalt-01.diagnostic/v1', status: 'post hoc, exploratory, no decision rule', set: 'held_out', seeds: [6001, 6400], k: 7, rounds: 4, summary }, null, 2) + '\n');
