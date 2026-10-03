import { readFile } from 'node:fs/promises';

const activePlanningFiles = [
  'hearth/houseglass.js',
  'apps/arcsweep/src/swarm/spawn-work-manifest.js',
  'apps/arcsweep/training/rarity-qwen3-8b/seed.jsonl',
  '03_ACTIVE_ROADMAP.md',
  'PROJECT_MAP.md',
  'docs/architecture/STARWELL_ARCHITECTURE_RULES.md',
];

const prohibited = [
  /smallest viable slice/i,
  /smallest implementation slice/i,
  /smallest implementation route/i,
  /smallest reversible implementation path/i,
  /smallest reversible repair/i,
  /expand the smallest viable seed/i,
  /thin vertical slice/i,
];

const requiredArchitecturePhrases = [
  'Top-down design',
  'Object-oriented',
  'whole system',
  'complete module',
];

const failures = [];

for (const path of activePlanningFiles) {
  const body = await readFile(path, 'utf8');
  for (const pattern of prohibited) {
    if (pattern.test(body)) {
      failures.push(`${path}: active planning source still contains prohibited smallest-slice default ${pattern}`);
    }
  }
}

const architecture = await readFile('docs/architecture/STARWELL_ARCHITECTURE_RULES.md', 'utf8');
for (const phrase of requiredArchitecturePhrases) {
  if (!architecture.toLowerCase().includes(phrase.toLowerCase())) {
    failures.push(`STARWELL architecture rules missing required whole-system principle: ${phrase}`);
  }
}

if (failures.length) {
  throw new Error(`Whole-system design law verification failed:\n- ${failures.join('\n- ')}`);
}

console.log('Whole-system design law verified.');
console.log('Whole system first. Top down. Modular by law. Complete modules, not accidental slices.');
