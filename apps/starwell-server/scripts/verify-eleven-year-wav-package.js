'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const starwellRoot = path.join(
  appRoot,
  'dist-electron',
  'win-unpacked',
  'resources',
  'app.asar.unpacked',
  'public',
  'starwell',
);
const assetsRoot = path.join(starwellRoot, 'assets');
const errors = [];

function requireFile(relativePath, label) {
  const filePath = path.join(starwellRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing packed ${label}: ${relativePath}`);
    return null;
  }
  return filePath;
}

const manifestPath = requireFile('modules/bifrost-arcsweep.module.json', 'Bifröst manifest');
let manifest = null;
if (manifestPath) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid packed Bifröst manifest: ${error.message}`);
  }
}

const compiledSource = fs.existsSync(assetsRoot)
  ? fs.readdirSync(assetsRoot)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsRoot, name), 'utf8'))
    .join('\n')
  : '';

for (const marker of [
  'hearthgate.two-shore-eleven-year-wav/v0.1',
  'hearthgate.two-shore-geometric-forms/v0.1',
  'Build all 11 years',
  'Play all 11',
  'Save WAV',
  'WAV_REQUIRES_ALL_ELEVEN_YEARS',
  'dodecahedron-tight-frame',
  'tesseract-tight-frame',
  'penteract-so5-tight-frame',
  'poincare-ball-point',
  'projective-quintic-proxy',
  'M(y)=1.15^(y-2025)',
]) {
  if (!compiledSource.includes(marker)) errors.push(`Packed STARWELL JavaScript is missing marker: ${marker}`);
}

if (manifest) {
  if (manifest.authorityContract?.allElevenYearsRequired !== true) errors.push('Packed manifest lost the eleven-year completion gate.');
  if (manifest.authorityContract?.everyYearRequiresFreshTwoShorePremaq !== true) errors.push('Packed manifest lost annual two-shore PREMAQ generation.');
  if (manifest.authorityContract?.deterministicGeometryRequiredPerShorePerYear !== true) errors.push('Packed manifest lost per-shore annual geometry.');
  if (manifest.authorityContract?.audibleElaraCodeLayer !== true) errors.push('Packed manifest lost the audible Elara code layer.');
  if (manifest.authorityContract?.wavExportRequired !== true || manifest.authorityContract?.wavYearCueCount !== 11) {
    errors.push('Packed manifest lost the eleven-cue WAV requirement.');
  }
  if (manifest.installContract?.verifyTwoShoreGeometricForms !== 'src/two-shore-geometric-forms.js') {
    errors.push('Packed install contract lost the geometric-form verifier path.');
  }
  if (manifest.installContract?.verifyElevenYearWav !== 'src/two-shore-eleven-year-wav.js') {
    errors.push('Packed install contract lost the WAV renderer path.');
  }
  if (manifest.installContract?.verifyElevenYearWavUi !== 'src/two-shore-eleven-year-wav-ui.js') {
    errors.push('Packed install contract lost the WAV controls path.');
  }
}

if (errors.length) {
  console.error('[Packed eleven-year WAV verification] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Packed eleven-year WAV verification] OK');
console.log(' complete two-shore annual generation, deterministic geometry, eleven cue labels, and WAV save controls are packed');
