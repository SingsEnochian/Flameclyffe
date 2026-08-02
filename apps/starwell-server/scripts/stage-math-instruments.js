'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const targetRoot = path.join(appRoot, 'instruments', 'math-spine');

const sources = [
  {
    id: 'observer-math-registry-v0',
    from: path.join(repoRoot, 'pytorch-labs', 'observer-math-registry-v0'),
    to: path.join(targetRoot, 'observer-math-registry-v0'),
  },
  {
    id: 'hearthgate-kernel-python',
    from: path.join(repoRoot, 'ml-lab', 'src', 'flameclyffe_ml', 'hearthgate_kernel'),
    to: path.join(targetRoot, 'flameclyffe-ml', 'hearthgate_kernel'),
  },
  {
    id: 'living-engine-python',
    from: path.join(repoRoot, 'ml-lab', 'src', 'flameclyffe_ml', 'living_engine'),
    to: path.join(targetRoot, 'flameclyffe-ml', 'living_engine'),
  },
  {
    id: 'resonance-python',
    from: path.join(repoRoot, 'ml-lab', 'src', 'flameclyffe_ml', 'resonance'),
    to: path.join(targetRoot, 'flameclyffe-ml', 'resonance'),
  },
];

const excludedNames = new Set([
  '.git', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache',
  '.ruff_cache', 'node_modules', 'dist', 'build',
]);
const excludedExtensions = new Set(['.pyc', '.pyo']);

function filter(source) {
  const name = path.basename(source);
  if (excludedNames.has(name)) return false;
  if (excludedExtensions.has(path.extname(name).toLowerCase())) return false;
  return true;
}

function copyInstrument(source) {
  if (!fs.existsSync(source.from)) {
    throw new Error(`Missing mathematics source: ${source.from}`);
  }
  fs.rmSync(source.to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(source.to), { recursive: true });
  fs.cpSync(source.from, source.to, { recursive: true, force: true, filter });
}

fs.mkdirSync(targetRoot, { recursive: true });
for (const source of sources) copyInstrument(source);

const manifest = {
  schema: 'hearthgate.math-instrument-bundle/v1',
  bundle_id: 'hearthgate-new-mathematics-spine',
  source_commit: process.env.GITHUB_SHA || process.env.HEARTHGATE_SOURCE_COMMIT || 'working-tree',
  instruments: sources.map(({ id, from, to }) => ({
    id,
    repository_path: path.relative(repoRoot, from).replaceAll(path.sep, '/'),
    packaged_path: path.relative(appRoot, to).replaceAll(path.sep, '/'),
  })),
  epistemic_law: {
    active_runtime: 'sourced-observer-packets-only',
    research_source_is_not_observation: true,
    defaults_may_not_claim_observed: true,
    random_or_untrained_parameters_may_not_claim_calibrated: true,
    synthetic_scaffolding_is_supplanted_by_verified_live_data: true,
  },
  runtime_relationship: {
    browser_instrument: 'public/starwell/instrument-hall/',
    python_kernel: 'instruments/math-spine/flameclyffe-ml/hearthgate_kernel/',
    pytorch_registry: 'instruments/math-spine/observer-math-registry-v0/',
  },
};
fs.writeFileSync(
  path.join(targetRoot, 'MANIFEST.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log('[Hearthgate mathematics staging] VERIFIED');
for (const source of sources) {
  console.log(` ${source.id}: ${path.relative(appRoot, source.to)}`);
}
console.log(' law: research sources remain non-authoritative until sourced observation/calibration activates them');
