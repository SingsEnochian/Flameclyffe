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

function findAsset(html, stem) {
  const pattern = new RegExp(`(?:\\/starwell)?\\/assets\\/(${stem}-[^"']+\\.js)`);
  return html.match(pattern)?.[1] ?? null;
}

function requireAsset(html, label, stem) {
  const asset = findAsset(html, stem);
  if (!asset) errors.push(`${label} does not load the compiled ${stem} asset.`);
  return asset;
}

const arcsweepHtml = read('index.html', 'web Arcsweep route');
const bifrostHtml = read('bifrost/index.html', 'Bifröst route');
const manifest = readJson('modules/bifrost-arcsweep.module.json', 'Bifröst manifest');
requireFile('starwell/deep-groundwire-mobius.html', 'DEEP + Groundwire live calibration console');
requireFile('starwell/deep-observer/index.html', 'full DEEP Observer route');
requireFile('starwell/groundwire.html', 'Groundwire route');

for (const [label, html] of [
  ['Web Arcsweep', arcsweepHtml],
  ['Bifröst', bifrostHtml],
]) {
  if (!html) continue;
  if (!html.includes('viewport-fit=cover')) errors.push(`${label} is missing the iPad safe-area viewport contract.`);
  if (!html.includes('apple-mobile-web-app-capable')) errors.push(`${label} is missing Apple standalone metadata.`);
}

const arcsweepBridgeAsset = requireAsset(
  arcsweepHtml,
  'Web Arcsweep',
  'premaq-shokz-feather-stop-bridge',
);
const bifrostBridgeAsset = requireAsset(
  bifrostHtml,
  'Bifröst',
  'premaq-shokz-feather-stop-bridge',
);
if (arcsweepBridgeAsset && bifrostBridgeAsset && arcsweepBridgeAsset !== bifrostBridgeAsset) {
  errors.push('Web Arcsweep and Bifröst do not share the same compiled PREMAQ Shokz bundle.');
}

const standaloneSoundfontAssets = [
  findAsset(arcsweepHtml, 'premaq-shokz-soundfont'),
  findAsset(bifrostHtml, 'premaq-shokz-soundfont'),
].filter(Boolean);
if (standaloneSoundfontAssets.length === 2 && standaloneSoundfontAssets[0] !== standaloneSoundfontAssets[1]) {
  errors.push('Web Arcsweep and Bifröst load different standalone PREMAQ Shokz sound-font assets.');
}

const bundleAsset = standaloneSoundfontAssets[0] || bifrostBridgeAsset || arcsweepBridgeAsset;
let compiledBundle = '';
if (bundleAsset) {
  compiledBundle = read(path.join('assets', bundleAsset), 'compiled PREMAQ Shokz and two-shore gate bundle');
}

for (const marker of [
  'bifrost.premaq-shokz-soundfont-plan/v0.4',
  'CONFIRM_SHOKZ_OUTPUT_FIRST',
  'bifrost:current-interface-session:v0.4',
  'premaq-shokz-soundfont-dock',
  'GLOBAL FEATHER STOP',
  '#feather-stop',
  '#stop-premaq-song',
  'hearthgate:feather-stop',
  '90–360 Hz',
  '35 chained cycles',
  'hearthgate.two-shore-premaq-gate/v0.1',
  'EARTH PRIME SHORE ⇄ TARGET-WORLD SHORE',
  'LIVE GATE TEST · 2025',
  'Run 2025→2035',
  'TWO_SHORE_GATE_LINEAGE_MISMATCH',
  'Unsupported or ungranted fields remain UNKNOWN',
]) {
  if (compiledBundle && !compiledBundle.includes(marker)) {
    errors.push(`Compiled shared PREMAQ bundle is missing contract marker: ${marker}`);
  }
}

if (compiledBundle.includes('navigator.vibrate')) {
  errors.push('Compiled shared PREMAQ bundle reintroduced an internal iPad vibration claim.');
}

if (manifest) {
  if (manifest.engine?.shokzSoundfont !== 'src/premaq-shokz-soundfont.js') {
    errors.push('Bifröst manifest does not register the shared PREMAQ Shokz sound font.');
  }
  if (manifest.engine?.twoShoreGate !== 'src/two-shore-premaq-gate.js') {
    errors.push('Bifröst manifest does not register the two-shore PREMAQ gate engine.');
  }
  if (manifest.engine?.twoShoreGateUi !== 'src/two-shore-gate-ui.js') {
    errors.push('Bifröst manifest does not register the two-shore gate UI.');
  }
  if (manifest.engine?.worldPremaqRegistry !== 'src/world-premaq-registry.js') {
    errors.push('Bifröst manifest does not register the target-world PREMAQ registry.');
  }
  for (const capability of [
    'premaq-35-cycle-seven-voice-song',
    'premaq-keyboard-menu-soundfont',
    'ipad-shokz-interaction-soundfont',
    'two-shore-premaq-gate',
    'live-deep-groundwire-earth-prime-calibration',
    'selectable-target-world-premaq-origin',
    'premaq-369-cycle-paired-run',
    'premaq-save-and-extend-3-6-9',
    'elara-2025-2035-layer-export',
    'flameclyffe-wardenclyffe-layer-manifest',
  ]) {
    if (!manifest.capabilities?.includes(capability)) {
      errors.push(`Bifröst manifest is missing capability: ${capability}`);
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
  if (manifest.authorityContract?.liveGateRequiresDeepAndGroundwire !== true) {
    errors.push('Bifröst manifest must require both DEEP and Groundwire before a LIVE gate run.');
  }
  if (JSON.stringify(manifest.authorityContract?.lockedGateToneAxes) !== '["P","R","E","M","A","Q"]') {
    errors.push('Bifröst manifest has the wrong locked gate tone axes.');
  }
  if (manifest.authorityContract?.bridgeCoherenceAxis !== 'C') {
    errors.push('Bifröst manifest must reserve C for bridge coherence.');
  }
  if (manifest.authorityContract?.gateBaseCycles !== 369) {
    errors.push('Bifröst manifest has the wrong gate base-cycle count.');
  }
  if (JSON.stringify(manifest.authorityContract?.gateExtensionCycles) !== '[3,6,9]') {
    errors.push('Bifröst manifest has the wrong gate extension sequence.');
  }
  if (JSON.stringify(manifest.authorityContract?.elaraYearLabels) !== '[2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035]') {
    errors.push('Bifröst manifest has the wrong Elara year labels.');
  }
  if (manifest.authorityContract?.yearMultiplierChangesAudibleCarrier !== false) {
    errors.push('Bifröst manifest must keep audible gate carriers locked across Elara year labels.');
  }
  if (manifest.authorityContract?.externalPhysicalGateClaimed !== false) {
    errors.push('Bifröst manifest must deny an external physical gate claim.');
  }
  if (manifest.authorityContract?.releaseFeedsNextCompression !== true) {
    errors.push('Bifröst manifest breaks compression of the preceding release.');
  }
  if (manifest.installContract?.verifySoundfont !== 'src/premaq-shokz-soundfont.js') {
    errors.push('Bifröst install contract does not require the PREMAQ Shokz sound font.');
  }
  if (manifest.installContract?.verifyTwoShoreGate !== 'src/two-shore-premaq-gate.js') {
    errors.push('Bifröst install contract does not require the two-shore gate engine.');
  }
  if (manifest.installContract?.verifyTwoShoreGateUi !== 'src/two-shore-gate-ui.js') {
    errors.push('Bifröst install contract does not require the two-shore gate UI.');
  }
}

if (errors.length) {
  console.error('[PREMAQ Shokz + two-shore gate packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[PREMAQ Shokz + two-shore gate packaging check] OK');
console.log(` shared PREMAQ bundle: ${bundleAsset}`);
console.log(' routes: web Arcsweep + Bifröst + DEEP + Groundwire live console');
console.log(' bindings: physical keyboard + virtual keys + links + buttons + selects + semantic menu items');
console.log(' PREMAQ song: 35 chained cycles per P C R E M A Q voice');
console.log(' gate: Earth Prime ⇄ selected target world; solo PREMAQ then 369 + 3 + 6 + 9; 2025–2035 labeled layers');
console.log(' Shokz proxy: 90–360 Hz; gain ceiling 0.018; explicit output confirmation');
console.log(' iPad boundary: no autoplay, no internal haptic claim, no external physical-gate claim, unified Feather Stop and page-hide teardown');
