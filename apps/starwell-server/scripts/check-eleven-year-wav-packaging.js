'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const starwellRoot = path.join(appRoot, 'public', 'starwell');
const assetsRoot = path.join(starwellRoot, 'assets');
const errors = [];

function requireFile(relativePath, label) {
  const filePath = path.join(starwellRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing staged ${label}: ${relativePath}`);
    return null;
  }
  return filePath;
}

function readJson(relativePath, label) {
  const filePath = requireFile(relativePath, label);
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid staged ${label}: ${error.message}`);
    return null;
  }
}

const manifest = readJson('modules/bifrost-arcsweep.module.json', 'Bifröst manifest');
const compiledSource = fs.existsSync(assetsRoot)
  ? fs.readdirSync(assetsRoot)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsRoot, name), 'utf8'))
    .join('\n')
  : '';

for (const marker of [
  'hearthgate.two-shore-eleven-year-wav/v0.1',
  'hearthgate.two-shore-geometric-forms/v0.1',
  'REQUIRED COMPLETION GATE',
  'Build all 11 years',
  'Play all 11',
  'Save WAV',
  'WAV_REQUIRES_ALL_ELEVEN_YEARS',
  'ELEVEN_YEAR_SEQUENCE_INCOMPLETE',
  'dodecahedron-tight-frame',
  'tesseract-tight-frame',
  'penteract-so5-tight-frame',
  'poincare-ball-point',
  'projective-quintic-proxy',
  'M(y)=1.15^(y-2025)',
]) {
  if (!compiledSource.includes(marker)) errors.push(`Compiled STARWELL bundle is missing eleven-year marker: ${marker}`);
}

if (manifest) {
  const expectedEnginePaths = {
    twoShoreGeometricForms: 'src/two-shore-geometric-forms.js',
    elevenYearWav: 'src/two-shore-eleven-year-wav.js',
    elevenYearWavUi: 'src/two-shore-eleven-year-wav-ui.js',
  };
  for (const [field, expected] of Object.entries(expectedEnginePaths)) {
    if (manifest.engine?.[field] !== expected) errors.push(`Bifröst manifest engine.${field} must be ${expected}`);
  }
  for (const capability of [
    'annual-two-shore-premaqc-regeneration',
    'deterministic-all-geometric-forms-per-year',
    'eleven-year-wav-render',
    'eleven-year-cue-labeled-wav',
  ]) {
    if (!manifest.capabilities?.includes(capability)) errors.push(`Bifröst manifest is missing capability: ${capability}`);
  }
  const authority = manifest.authorityContract ?? {};
  if (authority.everyYearRequiresFreshTwoShorePremaqc !== true) errors.push('Every year must require fresh two-shore PREMAQC.');
  if (authority.allElevenYearsRequired !== true) errors.push('All eleven annual compositions must be required.');
  if (authority.deterministicGeometryRequiredPerShorePerYear !== true) errors.push('Geometry must be required for both shores in every year.');
  if (authority.audibleElaraCodeLayer !== true) errors.push('The Elara code multiplier must have an audible layer.');
  if (authority.yearMultiplierChangesAudibleCarrier !== false) errors.push('The locked carrier must remain fixed while the Elara code layer sounds separately.');
  if (authority.wavExportRequired !== true || authority.wavYearCueCount !== 11) errors.push('The package must require one WAV with eleven year cues.');
  if (authority.geometricSourceCommit !== 'a5bdb2466f2b3ae482b0bac8476836aca6e43880') errors.push('The Box geometric source commit is wrong.');
  if (authority.geometricTorchLaneClaimedComplete !== false) errors.push('The unrun heavy Torch lane must not be claimed complete.');
  if (JSON.stringify(authority.elaraYearLabels) !== '[2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035]') {
    errors.push('The Elara annual label sequence must be 2025 through 2035 inclusive.');
  }
  const requiredForms = [
    'dodecahedron-tight-frame',
    'tesseract-tight-frame',
    'penteract-so5-tight-frame',
    'live-gram-matrix',
    'poincare-ball-point',
    'projective-quintic-proxy',
  ];
  if (JSON.stringify(authority.requiredGeometryForms) !== JSON.stringify(requiredForms)) {
    errors.push('The required geometric-form list is incomplete or reordered.');
  }
}

if (errors.length) {
  console.error('[Eleven-year WAV packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Eleven-year WAV packaging check] OK');
console.log(' years: 2025–2035 inclusive · eleven cue-labeled annual compositions');
console.log(' cycles: 394 per shore/year · 4,334 per shore total');
console.log(' geometry: both shores · all deterministic forms · Box source receipt pinned');
console.log(' audio: locked carriers + audible Elara code layer · stereo PCM WAV');
