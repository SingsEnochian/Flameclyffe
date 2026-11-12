// Run GESTALT-01 stage D exactly as pre-registered and write the results.
//   node scripts/gestalt-01-run.mjs [--limit N]
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { runExperiment } from '../lib/gestalt-01.mjs';

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const sha = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return null; } })();
const dirty = (() => { try { return execSync('git status --porcelain -- lib scripts docs/wayglass/gestalt-01', { encoding: 'utf8' }).trim() !== ''; } catch { return null; } })();
const started = new Date().toISOString();
let n = 0;
const results = await runExperiment({ limit, onTrial: () => { n += 1; if (n % 100 === 0) process.stderr.write(`${n} trials\n`); } });
results.apparatus = { commit: sha, dirty_tree: dirty, node: process.version, started, finished: new Date().toISOString(), trials: n, limit: Number.isFinite(limit) ? limit : null };
const outDir = new URL('../docs/wayglass/gestalt-01/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const file = Number.isFinite(limit) ? 'RESULTS-stage-D-smoke.json' : 'RESULTS-stage-D.json';
writeFileSync(new URL(file, outDir), JSON.stringify(results, null, 2) + '\n');
const pct = x => (100 * x).toFixed(1) + '%';
for (const [set, r] of Object.entries(results.sets)) {
  console.log(`\n${set}: ${r.tasks} tasks`);
  for (const [p, s] of Object.entries(r.protocols)) console.log(`  ${p.padEnd(16)} P=${pct(s.P)}  joint=${pct(s.joint)}  invalid=${s.invalid}  caught=${s.errors_caught.toFixed(2)}  introduced=${s.errors_introduced.toFixed(2)}  bits=${s.bits_retained.toFixed(2)}  lost=${pct(s.truth_lost)}  bytes=${s.bytes.toFixed(0)}`);
  for (const [b, g] of Object.entries(r.G)) console.log(`  G(mobius − ${b}) = ${g.mean.toFixed(3)}  95% CI [${g.lo.toFixed(3)}, ${g.hi.toFixed(3)}]`);
}
console.log('\nhypotheses:', JSON.stringify(results.hypotheses), '\nwritten:', file);
