// GESTALT-01 D3 · POST-HOC (no decision rule). For every identifiable held_out task the
// apparatus left unsolved: which single change solves it — more rounds (8), a lossless
// channel (exact candidate sets), or the task's own 'exactly one false' rule?
import { writeFileSync } from 'node:fs';
import { makeTask } from '../lib/gestalt-01.mjs';
import { replica, pooledWorlds, spec } from './gestalt-01-d3-replica.mjs';

const VARIANTS = { rounds_8: { rounds: 8 }, exact_channel: { channel: 'exact' }, exactly_one_rule: { tolerance: 'exactly' } };
const rows = [];
for (let s = 6001; s <= 6400; s++) {
  const t = makeTask(s, spec); if (!t || pooledWorlds(t).length !== 1) continue;
  if (replica(t).solved) continue;
  const v = Object.fromEntries(Object.entries(VARIANTS).map(([k, o]) => { const r = replica(t, o); return [k, { solved: r.solved, wrong_drops: r.wrongDrops, truth_lost: r.truthLost }]; }));
  rows.push({ seed: s, ...v });
}
const mech = r => (r.exactly_one_rule.solved && !r.rounds_8.solved && !r.exact_channel.solved ? 'discarded premise (at most one vs exactly one)'
  : !r.exactly_one_rule.solved && r.rounds_8.solved ? 'convergence time (round budget)' : 'mixed');
const summary = {}; for (const r of rows) summary[mech(r)] = (summary[mech(r)] || 0) + 1;
writeFileSync(new URL('../docs/wayglass/gestalt-01/DIAGNOSTIC-D3-dissociation-posthoc.json', import.meta.url), JSON.stringify({
  schema: 'wayglass.gestalt-01.diagnostic/v1', status: 'post hoc, exploratory, no decision rule; D3 registered results unchanged',
  set: 'held_out', question: 'which single change solves each identifiable task the apparatus left unsolved?', summary, tasks: rows.map(r => ({ ...r, mechanism: mech(r) })) }, null, 2) + '\n');
console.log(summary);
