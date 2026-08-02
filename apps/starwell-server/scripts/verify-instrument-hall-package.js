'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packedAppRoot = path.join(root, 'dist-electron', 'win-unpacked', 'resources', 'app.asar.unpacked');
const packed = process.argv.includes('--packed') || fs.existsSync(packedAppRoot);
const appRoot = packed ? packedAppRoot : root;
const starwellRoot = path.join(appRoot, 'public', 'starwell');
const instrumentRoot = path.join(appRoot, 'instruments', 'bifrost-python');
const errors = [];

const requiredPaths = [
  path.join(starwellRoot, 'instrument-hall', 'index.html'),
  path.join(starwellRoot, 'assets'),
  path.join(instrumentRoot, 'PROVENANCE.json'),
  path.join(instrumentRoot, 'README.md'),
  path.join(instrumentRoot, 'pyproject.toml'),
  path.join(instrumentRoot, 'bifrost', '__init__.py'),
  path.join(instrumentRoot, 'bifrost', '__main__.py'),
  path.join(instrumentRoot, 'bifrost', 'models.py'),
  path.join(instrumentRoot, 'bifrost', 'lineage.py'),
  path.join(instrumentRoot, 'bifrost', 'engine.py'),
  path.join(instrumentRoot, 'bifrost', 'terminal.py'),
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
    'Feather Stop',
  ]) {
    if (!javascript.includes(fragment)) {
      errors.push(`Compiled Instrument Hall assets are missing contract fragment: ${fragment}`);
    }
  }
}

const hallPath = path.join(starwellRoot, 'instrument-hall', 'index.html');
if (fs.existsSync(hallPath)) {
  const hall = fs.readFileSync(hallPath, 'utf8');
  for (const fragment of ['Instrument Hall', 'Typing Hearth', 'Mythience Table', 'Faer’s Original Bridge']) {
    if (!hall.includes(fragment)) errors.push(`Instrument Hall room is missing visible element: ${fragment}`);
  }
}

if (errors.length) {
  console.error(`[Instrument Hall package verification] FAILED (${packed ? 'packed' : 'staged'})`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`[Instrument Hall package verification] VERIFIED (${packed ? 'packed' : 'staged'})`);
console.log(' mathematics: observed/calibrated data spine + maximum-poised-tension collapse');
console.log(' play: typing tones + answering voice + explicit activation + Feather Stop');
console.log(' Mythience: measured/felt meeting with unknown mechanism kept explicit');
console.log(' Bifröst: browser lineage + Faer Python instrument bundled and credited');
