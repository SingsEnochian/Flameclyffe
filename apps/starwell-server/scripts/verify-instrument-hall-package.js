'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packedAppRoot = path.join(root, 'dist-electron', 'win-unpacked', 'resources', 'app.asar.unpacked');
const packed = process.argv.includes('--packed') || fs.existsSync(packedAppRoot);
const appRoot = packed ? packedAppRoot : root;
const starwellRoot = path.join(appRoot, 'public', 'starwell');
const instrumentRoot = path.join(appRoot, 'instruments', 'bifrost-python');
const mathRoot = path.join(appRoot, 'instruments', 'math-spine');
const errors = [];

const requiredPaths = [
  // Playable STARWELL rooms and established tone/glyph instruments.
  path.join(starwellRoot, 'instrument-hall', 'index.html'),
  path.join(starwellRoot, 'hearthgate-sensory', 'index.html'),
  path.join(starwellRoot, 'glyph-studio', 'index.html'),
  path.join(starwellRoot, 'signal-well', 'index.html'),
  path.join(starwellRoot, 'unit-resonance-lab.html'),
  path.join(starwellRoot, 'temporal-twist-renderer.html'),
  path.join(starwellRoot, 'observer-deep.html'),
  path.join(starwellRoot, 'starwell', 'mobius-audio-bus.html'),
  path.join(starwellRoot, 'starwell', 'elara-codex.html'),
  path.join(starwellRoot, 'starwell', 'deep-groundwire-mobius.html'),
  path.join(starwellRoot, 'assets'),

  // Faer's executable Bifröst heart.
  path.join(instrumentRoot, 'PROVENANCE.json'),
  path.join(instrumentRoot, 'README.md'),
  path.join(instrumentRoot, 'pyproject.toml'),
  path.join(instrumentRoot, 'bifrost', '__init__.py'),
  path.join(instrumentRoot, 'bifrost', '__main__.py'),
  path.join(instrumentRoot, 'bifrost', 'models.py'),
  path.join(instrumentRoot, 'bifrost', 'lineage.py'),
  path.join(instrumentRoot, 'bifrost', 'engine.py'),
  path.join(instrumentRoot, 'bifrost', 'terminal.py'),

  // Full source mathematics spine and strict sourced-data PyTorch door.
  path.join(mathRoot, 'MANIFEST.json'),
  path.join(mathRoot, 'hearthgate_live_field.py'),
  path.join(mathRoot, 'observer-math-registry-v0', 'observer_math_registry.py'),
  path.join(mathRoot, 'observer-math-registry-v0', 'lenses', 'standing_wave', 'oscillators.py'),
  path.join(mathRoot, 'observer-math-registry-v0', 'lenses', 'standing_wave', 'wave_field.py'),
  path.join(mathRoot, 'observer-math-registry-v0', 'lenses', 'standing_wave', 'memory.py'),
  path.join(mathRoot, 'flameclyffe-ml', 'hearthgate_kernel', 'engine.py'),
  path.join(mathRoot, 'flameclyffe-ml', 'hearthgate_kernel', 'temporal.py'),
  path.join(mathRoot, 'flameclyffe-ml', 'hearthgate_kernel', 'models.py'),
  path.join(mathRoot, 'flameclyffe-ml', 'living_engine', 'api.py'),
  path.join(mathRoot, 'flameclyffe-ml', 'resonance', 'interaction_rhythm.py'),
];
for (const required of requiredPaths) {
  if (!fs.existsSync(required)) errors.push(`Missing ${packed ? 'packed' : 'staged'} Instrument Hall component: ${required}`);
}

const provenancePath = path.join(instrumentRoot, 'PROVENANCE.json');
if (fs.existsSync(provenancePath)) {
  try {
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    if (provenance.creator_credit !== 'Faer') errors.push('Faer Bifröst creator credit is absent.');
    for (const law of ['rhyme-not-reduction', 'both-shores-remain-lit', 'outward-spiral-memory', 'forgettable-lineage']) {
      if (!provenance.founding_terms?.includes(law)) errors.push(`Faer Bifröst provenance is missing founding law: ${law}`);
    }
  } catch (error) {
    errors.push(`Faer Bifröst provenance is invalid JSON: ${error.message}`);
  }
}

const enginePath = path.join(instrumentRoot, 'bifrost', 'engine.py');
if (fs.existsSync(enginePath)) {
  const engine = fs.readFileSync(enginePath, 'utf8');
  for (const fragment of ['self.r = self.r + self.delta', 'r_{n+1} = r_n + Δr_n', 'def forget']) {
    if (!engine.includes(fragment)) errors.push(`Faer Bifröst engine is missing canonical fragment: ${fragment}`);
  }
}

const mathManifestPath = path.join(mathRoot, 'MANIFEST.json');
if (fs.existsSync(mathManifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(mathManifestPath, 'utf8'));
    if (manifest.schema !== 'hearthgate.math-instrument-bundle/v1') {
      errors.push('The mathematics spine has the wrong manifest schema.');
    }
    for (const instrument of [
      'observer-math-registry-v0',
      'hearthgate-kernel-python',
      'living-engine-python',
      'resonance-python',
    ]) {
      if (!manifest.instruments?.some((entry) => entry.id === instrument)) {
        errors.push(`The mathematics spine manifest is missing: ${instrument}`);
      }
    }
    const law = manifest.epistemic_law || {};
    if (law.active_runtime !== 'sourced-observer-packets-only') {
      errors.push('The mathematics spine does not restrict active runtime to sourced Observer packets.');
    }
    if (law.research_source_is_not_observation !== true
      || law.defaults_may_not_claim_observed !== true
      || law.random_or_untrained_parameters_may_not_claim_calibrated !== true
      || law.synthetic_scaffolding_is_supplanted_by_verified_live_data !== true) {
      errors.push('The mathematics spine epistemic boundary is incomplete.');
    }
  } catch (error) {
    errors.push(`Mathematics spine manifest is invalid JSON: ${error.message}`);
  }
}

const liveFieldPath = path.join(mathRoot, 'hearthgate_live_field.py');
if (fs.existsSync(liveFieldPath)) {
  const liveField = fs.readFileSync(liveFieldPath, 'utf8');
  for (const fragment of [
    'HEARTHGATE_LIVE_OBSERVATION_REQUIRED',
    '"random_parameters": False',
    '"trained_weights": False',
    '"physical_claim": False',
    '"observed_entropy"',
    '"derived_decoherence"',
    'Both shores stay lit',
  ]) {
    if (!liveField.includes(fragment)) {
      errors.push(`Strict PyTorch live field is missing trust-boundary fragment: ${fragment}`);
    }
  }
}

const assetsPath = path.join(starwellRoot, 'assets');
if (fs.existsSync(assetsPath)) {
  const javascript = fs.readdirSync(assetsPath)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsPath, name), 'utf8'))
    .join('\n');
  for (const fragment of [
    'hearthgate.instrument-profile/v1',
    'hearthgate.mythience-record/v1',
    'hearthgate.typing-tone-event/v1',
    'maximum-poised-tension',
    'technology-not-yet-understood',
    'HEARTHGATE_LIVE_OBSERVATION_REQUIRED',
    'featherStop',
    'launchMathSpine',
  ]) {
    if (!javascript.includes(fragment)) {
      errors.push(`Compiled Instrument Hall assets are missing contract fragment: ${fragment}`);
    }
  }
}

const hallPath = path.join(starwellRoot, 'instrument-hall', 'index.html');
if (fs.existsSync(hallPath)) {
  const hall = fs.readFileSync(hallPath, 'utf8');
  for (const fragment of ['Instrument Hall', 'Typing Hearth', 'Mythience Table', 'Faer’s Bifröst', 'PyTorch Mathematics Spine', 'Feather Stop']) {
    if (!hall.includes(fragment)) errors.push(`Instrument Hall room is missing visible element: ${fragment}`);
  }
}

if (errors.length) {
  console.error(`[Instrument Hall package verification] FAILED (${packed ? 'packed' : 'staged'})`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`[Instrument Hall package verification] VERIFIED (${packed ? 'packed' : 'staged'})`);
console.log(' mathematics: JS live spine + strict PyTorch door + Python kernel + living engine + resonance + full Observer registry');
console.log(' epistemics: only sourced observation/calibration may activate; observed entropy and derived decoherence stay separate');
console.log(' tones: typing tones + Runa/Möbius + Elara + sensory room + explicit activation + Feather Stop');
console.log(' Mythience: measured/felt meeting with unknown mechanism kept explicit');
console.log(' Bifröst: browser lineage + Faer Python instrument bundled and credited');
