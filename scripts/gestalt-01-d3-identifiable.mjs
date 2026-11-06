// GESTALT-01 D3 · POST-HOC (no decision rule). The identifiability ceiling, and the
// identifiable tasks the apparatus left unsolved. Also: the 'exactly one false' rule,
// which the task states and both quads know, but the protocol's tolerance ("at most one")
// does not use. Not an oracle: no quad learns which constraint is false.
import { writeFileSync } from 'node:fs';
import { makeTask, stratum } from '../lib/gestalt-01.mjs';
import { replica, pooledWorlds, sat, spec } from './gestalt-01-d3-replica.mjs';

const rows = { S: [], notS: [] };
for (let s = 6001; s <= 6400; s++) {
  const t = makeTask(s, spec); if (!t) continue;
  const st = stratum(t).S ? 'S' : 'notS';
  const worlds = pooledWorlds(t).length;
  const base = replica(t); const exact = replica(t, { tolerance: 'exactly' });
  const finalOwnZero = base.rounds.at(-1).map((x, qi) => x.cands.filter(a => t[['A', 'B'][qi]].constraints.every(c => sat(c, a))).length);
  rows[st].push({ seed: s, worlds, identifiable: worlds === 1, base: base.solved, exact: exact.solved,
    exact_wrong_drops: exact.wrongDrops, exact_truth_lost: exact.truthLost,
    final_candidates: base.rounds.at(-1).map(x => x.cands.length), final_candidates_violating_none_of_own: finalOwnZero });
}
const summary = Object.fromEntries(Object.entries(rows).map(([st, r]) => {
  const id = r.filter(x => x.identifiable); const un = r.filter(x => !x.identifiable);
  return [st, { tasks: r.length, identifiable: id.length,
    apparatus_solved: { identifiable: id.filter(x => x.base).length, unidentifiable: un.filter(x => x.base).length },
    exactly_one_rule_solved: { identifiable: id.filter(x => x.exact).length, unidentifiable: un.filter(x => x.exact).length },
    exactly_one_rule_wrong_drops: r.reduce((n, x) => n + x.exact_wrong_drops, 0), exactly_one_rule_truth_lost: r.filter(x => x.exact_truth_lost).length,
    identifiable_unsolved_by_apparatus: id.filter(x => !x.base) }];
}));
writeFileSync(new URL('../docs/wayglass/gestalt-01/DIAGNOSTIC-D3-identifiability-posthoc.json', import.meta.url), JSON.stringify({
  schema: 'wayglass.gestalt-01.diagnostic/v1', status: 'post hoc, exploratory, no decision rule; D3 registered results unchanged',
  set: 'held_out', seeds: [6001, 6400], k: 7, rounds: 4,
  identifiable_means: 'exactly one assignment satisfies all but exactly one constraint of each quad (the task rule): the ceiling for any protocol that does not guess',
  summary }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 1));
