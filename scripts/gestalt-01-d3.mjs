// GESTALT-01 stage D3, in registered order:
//   node scripts/gestalt-01-d3.mjs reproduce-d2 → the changed apparatus must re-derive D2 held_out exactly
//   node scripts/gestalt-01-d3.mjs strata       → stratum sizes per set (task-only; no protocol is run)
//   node scripts/gestalt-01-d3.mjs main <set>   → RESULTS-stage-D3-<set>.json (refuses on a dirty apparatus)
//   node scripts/gestalt-01-d3.mjs analyze      → combines the per-set results into the registered verdicts
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { runExperiment, preregistration, makeTask, stratum, analyzeD3, PROTOCOLS_D3 } from '../lib/gestalt-01.mjs';

const dir = new URL('../docs/wayglass/gestalt-01/', import.meta.url);
const git = cmd => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return null; } };
const stamp = () => ({ commit: git('git rev-parse HEAD'), dirty_tree: git('git status --porcelain -- lib scripts') !== '', node: process.version, at: new Date().toISOString() });
let n = 0; const progress = () => { n += 1; if (n % 200 === 0) process.stderr.write(`${n} trials\n`); };
const { prereg, sha256 } = preregistration('PREREGISTRATION-D3.json');
const { k, rounds } = prereg.main.config;
const mode = process.argv[2];

if (mode === 'reproduce-d2') {
  const original = JSON.parse(readFileSync(new URL('RESULTS-stage-D2-held_out.json', dir), 'utf8'));
  const spec = preregistration('PREREGISTRATION-D2.json').prereg.main.sets.held_out;
  const again = await runExperiment({ preregFile: 'PREREGISTRATION-D2.json', sets: { held_out: spec }, k: original.config.k, rounds: original.config.rounds, onTrial: progress });
  const same = again.sets.held_out.trials_digest === original.sets.held_out.trials_digest;
  const record = { schema: 'wayglass.gestalt-01.reproduction/v1', of: 'RESULTS-stage-D2-held_out.json', identical: same,
    trials_digest: again.sets.held_out.trials_digest, apparatus: stamp() };
  writeFileSync(new URL('REPRODUCTION-D2-under-D3.json', dir), JSON.stringify(record, null, 2) + '\n');
  console.log(`D2 held_out under the D3 apparatus: ${same ? 'IDENTICAL' : 'DIFFERENT'} (${record.trials_digest.slice(0, 18)}…)`);
  if (!same) process.exitCode = 1;
} else if (mode === 'strata') {
  const rows = {};
  for (const [name, spec] of Object.entries(prereg.main.sets)) {
    let tasks = 0, S = 0;
    for (let s = spec.seeds[0]; s <= spec.seeds[1]; s++) { const t = makeTask(s, { ...spec, k }); if (!t) continue; tasks += 1; if (stratum(t).S) S += 1; }
    rows[name] = { tasks, S, notS: tasks - S };
    console.log(`${name}: ${tasks} tasks · S ${S} · not S ${tasks - S}`);
  }
  writeFileSync(new URL('STRATA-D3.json', dir), JSON.stringify({ schema: 'wayglass.gestalt-01.strata/v1', preregistration_sha256: sha256, k, rows, apparatus: stamp() }, null, 2) + '\n');
} else if (mode === 'main') {
  const set = process.argv[3];
  if (!prereg.main.sets[set]) throw new Error(`usage: main ${Object.keys(prereg.main.sets).join('|')}`);
  if (stamp().dirty_tree) throw new Error('Apparatus has uncommitted changes: commit lib/ and scripts/ before collecting D3 data.');
  const rep = existsSync(new URL('REPRODUCTION-D2-under-D3.json', dir)) && JSON.parse(readFileSync(new URL('REPRODUCTION-D2-under-D3.json', dir), 'utf8'));
  if (!rep?.identical) throw new Error('The D3 apparatus has not reproduced D2: run reproduce-d2 first.');
  const keep = {};
  const res = await runExperiment({ preregFile: 'PREREGISTRATION-D3.json', sets: { [set]: prereg.main.sets[set] }, k, rounds, protocols: PROTOCOLS_D3, keep, onTrial: progress });
  const { d3 } = analyzeD3(res, keep);
  res.d3 = d3; res.apparatus = { ...stamp(), trials: n };
  writeFileSync(new URL(`RESULTS-stage-D3-${set}.json`, dir), JSON.stringify(res, null, 2) + '\n');
  console.log(`written RESULTS-stage-D3-${set}.json · ${n} trials`);
} else if (mode === 'analyze') {
  const parts = Object.keys(prereg.main.sets).map(set => JSON.parse(readFileSync(new URL(`RESULTS-stage-D3-${set}.json`, dir), 'utf8')));
  const out = { config: { k, rounds }, sets: Object.assign({}, ...parts.map(p => p.sets)) };
  const d3 = Object.assign({}, ...parts.map(p => p.d3));
  const pos = g => (g ? g.lo > 0 : null);
  const st = (set, s) => d3[set]?.strata[s];
  const verdict = (set, s, test) => ((st(set, s)?.tasks ?? 0) >= 40 ? test(st(set, s).G_mobius_vs_bus_transformed) : 'underpowered, not tested');
  const hypotheses = {
    H5: verdict('held_out', 'S', pos), H6: verdict('held_out', 'notS', g => g.lo <= 0 && g.hi >= 0),
    H7: pos(d3.held_out.G_mobius_half_vs_noflip), H7b: pos(d3.held_out.B_correct_mobius_half_vs_noflip),
    H8: pos(out.sets.held_out.G.bus), H9: verdict('shifted', 'S', pos) };
  writeFileSync(new URL('VERDICTS-stage-D3.json', dir), JSON.stringify({ schema: 'wayglass.gestalt-01.verdicts/v1', preregistration_sha256: sha256,
    results: parts.map(p => ({ set: Object.keys(p.sets)[0], commit: p.apparatus.commit, trials: p.apparatus.trials, dirty_tree: p.apparatus.dirty_tree })), hypotheses }, null, 2) + '\n');
  const f = g => (g ? `${g.mean.toFixed(3)} [${g.lo.toFixed(3)}, ${g.hi.toFixed(3)}]` : 'n/a');
  for (const [set, d] of Object.entries(d3)) {
    console.log(`\n${set}`);
    for (const [s, x] of Object.entries(d.strata)) console.log(`  ${s.padEnd(5)} n=${x.tasks}  G(mobius − bus_transformed) ${f(x.G_mobius_vs_bus_transformed)}  P ${JSON.stringify(Object.fromEntries(Object.entries(x.P).map(([p, v]) => [p, v == null ? null : +v.toFixed(3)])))}  dropped-false ${x.mobius_dropped_false?.toFixed(3)}`);
    console.log(`  G(mobius_half − noflip) ${f(d.G_mobius_half_vs_noflip)} · B-correct diff ${f(d.B_correct_mobius_half_vs_noflip)}`);
    console.log(`  B correct ${JSON.stringify(Object.fromEntries(Object.entries(d.B_correct).map(([p, v]) => [p, +v.toFixed(3)])))}`);
    console.log(`  bytes/round ${JSON.stringify(d.bytes_per_round)}`);
    for (const [p, s] of Object.entries(out.sets[set].protocols)) console.log(`  ${p.padEnd(16)} P=${(100 * s.P).toFixed(1)}% invalid=${s.invalid} caught=${s.errors_caught.toFixed(2)} intro=${s.errors_introduced.toFixed(2)} lost=${(100 * s.truth_lost).toFixed(1)}% growth=${s.growth_mean.toFixed(2)} E1=${s.E1_growth_vs_success?.toFixed(3) ?? 'n/a'}`);
  }
  console.log('\nhypotheses:', JSON.stringify(hypotheses));
} else {
  console.error('usage: gestalt-01-d3.mjs reproduce-d2 | strata | main <set> | analyze'); process.exitCode = 2;
}
