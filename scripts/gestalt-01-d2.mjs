// GESTALT-01 stage D2, in registered order:
//   node scripts/gestalt-01-d2.mjs calibrate   → CALIBRATION-D2.json (commit it on its own)
//   node scripts/gestalt-01-d2.mjs main        → RESULTS-stage-D2.json (refuses without a committed calibration)
//   node scripts/gestalt-01-d2.mjs reproduce-d → re-derives stage D's trials digests (refactor check)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { calibrate, runExperiment, preregistration } from '../lib/gestalt-01.mjs';

const dir = new URL('../docs/wayglass/gestalt-01/', import.meta.url);
const git = cmd => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return null; } };
const stamp = () => ({ commit: git('git rev-parse HEAD'), dirty_tree: git('git status --porcelain -- lib scripts docs/wayglass/gestalt-01') !== '', node: process.version, at: new Date().toISOString() });
let n = 0; const progress = () => { n += 1; if (n % 100 === 0) process.stderr.write(`${n} trials\n`); };
const mode = process.argv[2];

if (mode === 'calibrate') {
  const cal = await calibrate({ onTrial: progress });
  cal.apparatus = stamp();
  writeFileSync(new URL('CALIBRATION-D2.json', dir), JSON.stringify(cal, null, 2) + '\n');
  for (const g of cal.grid) console.log(`k=${g.k} rounds=${g.rounds} tasks=${g.tasks} bus_transformed=${g.success === null ? 'n/a' : (100 * g.success).toFixed(1) + '%'}`);
  console.log('selected:', JSON.stringify(cal.selected), 'rule satisfied:', cal.rule_satisfied);
} else if (mode === 'main') {
  const calFile = new URL('CALIBRATION-D2.json', dir);
  if (!existsSync(calFile)) throw new Error('No calibration: run `calibrate` and commit it first.');
  if (git('git status --porcelain -- docs/wayglass/gestalt-01/CALIBRATION-D2.json')) throw new Error('Calibration not committed: commit it on its own before the main run.');
  const cal = JSON.parse(readFileSync(calFile, 'utf8'));
  const { sha256 } = preregistration('PREREGISTRATION-D2.json');
  if (cal.preregistration_sha256 !== sha256) throw new Error('Calibration was made under a different pre-registration.');
  const sets = process.argv[3] ? { [process.argv[3]]: preregistration('PREREGISTRATION-D2.json').prereg.main.sets[process.argv[3]] } : undefined;
  const res = await runExperiment({ preregFile: 'PREREGISTRATION-D2.json', sets, k: cal.selected.k, rounds: cal.selected.rounds, onTrial: progress });
  res.calibration = cal.selected; res.apparatus = { ...stamp(), trials: n };
  const file = process.argv[3] ? `RESULTS-stage-D2-${process.argv[3]}.json` : 'RESULTS-stage-D2.json';
  writeFileSync(new URL(file, dir), JSON.stringify(res, null, 2) + '\n');
  const pct = x => (100 * x).toFixed(1) + '%';
  for (const [set, r] of Object.entries(res.sets)) {
    console.log(`\n${set}: ${r.tasks} tasks (k=${res.config.k}, rounds=${res.config.rounds})`);
    for (const [p, s] of Object.entries(r.protocols)) console.log(`  ${p.padEnd(16)} P=${pct(s.P)} invalid=${s.invalid} caught=${s.errors_caught.toFixed(2)} intro=${s.errors_introduced.toFixed(2)} bits=${s.bits_retained.toFixed(2)} lost=${pct(s.truth_lost)} growth=${s.growth_mean.toFixed(2)} E1=${s.E1_growth_vs_success?.toFixed(3) ?? 'n/a'} E2=${s.E2_growth_vs_truth_lost?.toFixed(3) ?? 'n/a'}`);
    for (const [b, g] of Object.entries(r.G)) console.log(`  G(mobius − ${b}) = ${g.mean.toFixed(3)}  95% CI [${g.lo.toFixed(3)}, ${g.hi.toFixed(3)}]`);
  }
  console.log('\nhypotheses (this run):', JSON.stringify(res.hypotheses), '\nwritten:', file);
} else if (mode === 'reproduce-d') {
  const original = JSON.parse(readFileSync(new URL('RESULTS-stage-D.json', dir), 'utf8'));
  const set = process.argv[3] || 'held_out';
  const spec = preregistration('PREREGISTRATION.json').prereg.task_family.sets[set];
  const again = await runExperiment({ sets: { [set]: spec }, onTrial: progress });
  const same = again.sets[set].trials_digest === original.sets[set].trials_digest;
  console.log(`stage D ${set}: trials digest ${same ? 'IDENTICAL' : 'DIFFERENT'} (${again.sets[set].trials_digest.slice(0, 18)}…)`);
  if (!same) process.exitCode = 1;
} else {
  console.error('usage: gestalt-01-d2.mjs calibrate | main [set] | reproduce-d [set]'); process.exitCode = 2;
}
