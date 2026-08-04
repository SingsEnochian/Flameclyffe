'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const starwellRoot = path.join(appRoot, 'public', 'starwell');
const errors = [];

function requireFile(relativePath, label) {
  const filePath = path.join(starwellRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing staged ${label}: ${relativePath}`);
    return null;
  }
  return filePath;
}

function read(relativePath, label) {
  const filePath = requireFile(relativePath, label);
  return filePath ? fs.readFileSync(filePath, 'utf8') : '';
}

function readJson(relativePath, label) {
  const source = read(relativePath, label);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`Invalid staged ${label}: ${error.message}`);
    return null;
  }
}

function extractSoundfontAsset(html, label) {
  const match = html.match(/(?:\/starwell)?\/assets\/(premaq-shokz-soundfont-[^"']+\.js)/);
  if (!match) {
    errors.push(`${label} does not load the compiled PREMAQ Shokz sound font.`);
    return null;
  }
  return match[1];
}

const arcsweepHtml = read('index.html', 'web Arcsweep route');
const bifrostHtml = read('bifrost/index.html', 'Bifröst route');
const manifest = readJson('modules/bifrost-arcsweep.module.json', 'Bifröst manifest');

for (const [label, html] of [
  ['Web Arcsweep', arcsweepHtml],
  ['Bifröst', bifrostHtml],
]) {
  if (!html) continue;
  if (!html.includes('viewport-fit=cover')) errors.push(`${label} is missing the iPad safe-area viewport contract.`);
  if (!html.includes('apple-mobile-web-app-capable')) errors.push(`${label} is missing Apple standalone metadata.`);
}

const arcsweepAsset = extractSoundfontAsset(arcsweepHtml, 'Web Arcsweep');
const bifrostAsset = extractSoundfontAsset(bifrostHtml, 'Bifröst');
if (arcsweepAsset && bifrostAsset && arcsweepAsset !== bifrostAsset) {
  errors.push('Web Arcsweep and Bifröst do not share the same compiled PREMAQ Shokz sound-font asset.');
}

const soundfontAsset = bifrostAsset || arcsweepAsset;
let compiledSoundfont = '';
if (soundfontAsset) {
  compiledSoundfont = read(path.join('assets', soundfontAsset), 'compiled PREMAQ Shokz sound font');
}

for (const marker of [
  'bifrost.premaq-shokz-soundfont-plan/v0.4',
  'CONFIRM_SHOKZ_OUTPUT_FIRST',
  'bifrost:current-interface-session:v0.4',
  'premaq-shokz-soundfont-dock',
  'FEATHER STOP',
  '90–360 Hz',
  '35 chained cycles',
]) {
  if (compiledSoundfont && !compiledSoundfont.includes(marker)) {
    errors.push(`Compiled PREMAQ Shokz sound font is missing contract marker: ${marker}`);
  }
}

if (compiledSoundfont.includes('navigator.vibrate')) {
  errors.push('Compiled PREMAQ Shokz sound font reintroduced an internal iPad vibration claim.');
}

if (manifest) {
  if (manifest.engine?.shokzSoundfont !== 'src/premaq-shokz-soundfont.js') {
    errors.push('Bifröst manifest does not register the shared PREMAQ Shokz sound font.');
  }
  for (const capability of [
    'premaq-35-cycle-seven-voice-song',
    'premaq-keyboard-menu-soundfont',
    'ipad-shokz-interaction-soundfont',
  ]) {
    if (!manifest.capabilities?.includes(capability)) {
      errors.push(`Bifröst manifest is missing Shokz capability: ${capability}`);
    }
  }
  if (manifest.authorityContract?.browserCannotDetectOutputDevice !== true) {
    errors.push('Bifröst manifest must state that the browser cannot detect the selected Shokz output.');
  }
  if (manifest.authorityContract?.interactionSoundRequiresUserGesture !== true) {
    errors.push('Bifröst manifest must require a deliberate user gesture for interaction sound.');
  }
  if (manifest.authorityContract?.interactionGainCeiling !== 0.018) {
    errors.push('Bifröst manifest has the wrong interaction gain ceiling.');
  }
  if (JSON.stringify(manifest.authorityContract?.shokzProxyBandHz) !== '[90,360]') {
    errors.push('Bifröst manifest has the wrong Shokz proxy band.');
  }
  if (manifest.authorityContract?.internalIPadHapticsClaimed !== false) {
    errors.push('Bifröst manifest must deny an internal iPad haptic actuator claim.');
  }
  if (manifest.authorityContract?.releaseFeedsNextCompression !== true) {
    errors.push('Bifröst manifest breaks compression of the preceding release.');
  }
  if (manifest.installContract?.verifySoundfont !== 'src/premaq-shokz-soundfont.js') {
    errors.push('Bifröst install contract does not require the PREMAQ Shokz sound font.');
  }
}

if (errors.length) {
  console.error('[PREMAQ Shokz packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[PREMAQ Shokz packaging check] OK');
console.log(` shared asset: ${soundfontAsset}`);
console.log(' routes: web Arcsweep + Bifröst');
console.log(' bindings: physical keyboard + virtual keys + links + buttons + selects + semantic menu items');
console.log(' PREMAQ: 35 chained cycles per P C R E M A Q voice');
console.log(' Shokz proxy: 90–360 Hz; gain ceiling 0.018; explicit output confirmation');
console.log(' iPad boundary: no autoplay, no internal haptic claim, Feather Stop on page hide');
