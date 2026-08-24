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
  const direct = html.match(pattern)?.[1] ?? null;
  if (direct) return direct;

  const bundledStem = {
    'premaqc-shokz-soundfont': 'premaqc-shokz-feather-stop-bridge',
    'premaqc-song': 'premaqc-shokz-feather-stop-bridge',
    'two-shore-premaqc': 'bifrost',
  }[stem];
  return bundledStem ? findAsset(html, bundledStem) : null;
}

function requireAsset(html, label, stem) {
  const asset = findAsset(html, stem);
  if (!asset) errors.push(`${label} does not load the compiled ${stem} organ.`);
  return asset;
}

function readAsset(asset, label) {
  return asset ? read(path.join('assets', asset), label) : '';
}

function requireMarkers(source, label, markers) {
  for (const marker of markers) {
    if (source && !source.includes(marker)) errors.push(`${label} is missing contract marker: ${marker}`);
  }
}

const arcsweepHtml = read('index.html', 'web Arcsweep route');
const bifrostHtml = read('bifrost/index.html', 'Bifröst route');
const manifest = readJson('modules/bifrost-arcsweep.module.json', 'Bifröst manifest');
const premaqcSchema = readJson('schemas/premaqc-state-v2.schema.json', 'PREMAQC v2 schema');
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

requireMarkers(bifrostHtml, 'Bifröst HTML', [
  'PREMAQC',
  'Six dynamic voices across thirty-five chained cycles',
  'Q · firsthand context only · not sonified',
  'Unsupported or ungranted values remain UNKNOWN',
]);
if (bifrostHtml.includes('<option value="Q"')) {
  errors.push('Bifröst still exposes Q as a compression focus.');
}
if (/FULL PREMAQ(?!C)/.test(bifrostHtml) || />PREMAQ</.test(bifrostHtml)) {
  errors.push('Bifröst still emits PREMAQ as current visible vocabulary.');
}

const arcsweepSoundfontAsset = requireAsset(arcsweepHtml, 'Web Arcsweep', 'premaqc-shokz-soundfont');
const bifrostSoundfontAsset = requireAsset(bifrostHtml, 'Bifröst', 'premaqc-shokz-soundfont');
if (arcsweepSoundfontAsset && bifrostSoundfontAsset && arcsweepSoundfontAsset !== bifrostSoundfontAsset) {
  errors.push('Web Arcsweep and Bifröst do not share the same compiled PREMAQC Shokz soundfont organ.');
}

const arcsweepBridgeAsset = requireAsset(arcsweepHtml, 'Web Arcsweep', 'premaqc-shokz-feather-stop-bridge');
const bifrostBridgeAsset = requireAsset(bifrostHtml, 'Bifröst', 'premaqc-shokz-feather-stop-bridge');
if (arcsweepBridgeAsset && bifrostBridgeAsset && arcsweepBridgeAsset !== bifrostBridgeAsset) {
  errors.push('Web Arcsweep and Bifröst do not share the same compiled PREMAQC Feather Stop bridge.');
}

const bifrostSongAsset = requireAsset(bifrostHtml, 'Bifröst', 'premaqc-song');
const twoShorePanelAsset = requireAsset(bifrostHtml, 'Bifröst', 'two-shore-premaqc');

const compiledSoundfont = readAsset(arcsweepSoundfontAsset || bifrostSoundfontAsset, 'compiled PREMAQC Shokz soundfont organ');
const compiledBridge = readAsset(arcsweepBridgeAsset || bifrostBridgeAsset, 'compiled PREMAQC Feather Stop bridge');
const compiledSong = readAsset(bifrostSongAsset, 'compiled PREMAQC song organ');
const compiledTwoShore = readAsset(twoShorePanelAsset, 'compiled two-shore PREMAQC panel');

requireMarkers(compiledSoundfont, 'Compiled PREMAQC soundfont organ', [
  'bifrost.premaqc-shokz-soundfont-plan/v1',
  'PREMAQC',
  'context_only_axes',
  'qualia_sonified',
]);
requireMarkers(compiledBridge, 'Compiled PREMAQC Feather Stop bridge', [
  'hearthgate.premaqc-shokz-feather-stop-bridge/v1',
  'hearthgate.two-shore-premaqc-gate/v1',
  'PREMAQC',
]);
requireMarkers(compiledSong, 'Compiled PREMAQC song organ', [
  'bifrost.premaqc-full-song-plan/v1',
  'PREMAQC',
]);
requireMarkers(compiledTwoShore, 'Compiled two-shore PREMAQC panel', [
  'bifrost.two-shore-premaqc-panel/v1',
  'qualia_compression_focus_allowed',
  'PREMAQC',
]);

for (const source of [compiledSoundfont, compiledBridge, compiledSong, compiledTwoShore]) {
  if (source.includes('navigator.vibrate')) {
    errors.push('Compiled PREMAQC sensory bundle reintroduced an internal iPad vibration claim.');
    break;
  }
}

if (premaqcSchema) {
  if (premaqcSchema.title !== 'PREMAQC Observation State v2') {
    errors.push('Canonical schema title is not PREMAQC Observation State v2.');
  }
  const q = premaqcSchema.$defs?.qualiaPresenceComponent;
  if (!q) errors.push('Canonical PREMAQC schema is missing the Qualia presence component.');
  if (premaqcSchema.$defs?.qualiaReport?.properties?.authority?.const !== 'firsthand-only') {
    errors.push('Canonical PREMAQC schema does not enforce firsthand-only Qualia authority.');
  }
  if (premaqcSchema.$defs?.qualiaReport?.properties?.inferred?.const !== false) {
    errors.push('Canonical PREMAQC schema does not forbid inferred Qualia.');
  }
}

if (manifest) {
  if (manifest.version !== '0.5.0' || manifest.schemaVersion !== '0.5.0') {
    errors.push('Bifröst manifest must expose canonical PREMAQC contract version 0.5.0.');
  }
  if (manifest.schemas?.premaqc !== 'schemas/premaqc-state-v2.schema.json') {
    errors.push('Bifröst manifest does not register the canonical PREMAQC schema.');
  }
  if (manifest.engine?.premaqcShokzSoundfont !== 'src/premaqc-shokz-soundfont.js') {
    errors.push('Bifröst manifest does not register the canonical PREMAQC Shokz soundfont.');
  }
  if (manifest.engine?.twoShorePremaqcGate !== 'src/two-shore-premaqc-gate.js') {
    errors.push('Bifröst manifest does not register the canonical two-shore PREMAQC gate.');
  }
  if (manifest.engine?.worldPremaqcRegistry !== 'src/world-premaqc-registry.js') {
    errors.push('Bifröst manifest does not register the canonical world PREMAQC registry.');
  }
  for (const capability of [
    'premaqc-v2-ingest',
    'premaqc-35-cycle-six-dynamic-voice-song',
    'premaqc-keyboard-menu-soundfont',
    'two-shore-premaqc-gate',
    'live-deep-groundwire-earth-prime-calibration',
    'selectable-target-world-premaqc-origin',
    'premaqc-369-cycle-paired-run',
    'premaqc-save-and-extend-3-6-9',
    'elara-2025-2035-layer-export',
    'flameclyffe-wardenclyffe-layer-manifest',
  ]) {
    if (!manifest.capabilities?.includes(capability)) errors.push(`Bifröst manifest is missing capability: ${capability}`);
  }

  const authority = manifest.authorityContract || {};
  if (authority.premaqcCanonicalVocabulary !== true) errors.push('Manifest must declare PREMAQC as canonical vocabulary.');
  if (authority.legacyPremaqAliasesCompatibilityOnly !== true) errors.push('Manifest must quarantine PREMAQ aliases as compatibility-only.');
  if (JSON.stringify(authority.dynamicPremaqcAxes) !== '["P","C","R","E","M","A"]') errors.push('Manifest has the wrong dynamic PREMAQC axes.');
  if (JSON.stringify(authority.contextOnlyPremaqcAxes) !== '["Q"]') errors.push('Manifest must keep Q context-only.');
  if (authority.qualiaFirsthandOnly !== true) errors.push('Manifest must enforce firsthand-only Qualia.');
  if (authority.qualiaMagnitudeInferenceAllowed !== false) errors.push('Manifest must forbid Qualia magnitude inference.');
  if (authority.qualiaCompressionFocusAllowed !== false) errors.push('Manifest must forbid Q as compression focus.');
  if (authority.qualiaSonified !== false) errors.push('Manifest must forbid Qualia sonification.');
  if (authority.browserCannotDetectOutputDevice !== true) errors.push('Manifest must state that the browser cannot detect the selected Shokz output.');
  if (authority.interactionSoundRequiresUserGesture !== true) errors.push('Manifest must require a deliberate user gesture for interaction sound.');
  if (authority.interactionGainCeiling !== 0.018) errors.push('Manifest has the wrong interaction gain ceiling.');
  if (JSON.stringify(authority.shokzProxyBandHz) !== '[90,360]') errors.push('Manifest has the wrong Shokz proxy band.');
  if (authority.internalIPadHapticsClaimed !== false) errors.push('Manifest must deny an internal iPad haptic actuator claim.');
  if (authority.liveGateRequiresDeepAndGroundwire !== true) errors.push('Manifest must require both DEEP and Groundwire before a LIVE gate run.');
  if (authority.earthPrimeUnknownSignalsRemainExplicit !== true) errors.push('Manifest must preserve unsupported or ungranted Earth Prime fields as UNKNOWN.');
  if (JSON.stringify(authority.lockedGateToneAxes) !== '["P","R","E","M","A"]') errors.push('Manifest has the wrong locked dynamic gate tone axes.');
  if (authority.bridgeCoherenceAxis !== 'C') errors.push('Manifest must reserve C for bridge coherence.');
  if (authority.gateBaseCycles !== 369) errors.push('Manifest has the wrong gate base-cycle count.');
  if (JSON.stringify(authority.gateExtensionCycles) !== '[3,6,9]') errors.push('Manifest has the wrong gate extension sequence.');
  if (JSON.stringify(authority.elaraYearLabels) !== '[2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035]') errors.push('Manifest has the wrong Elara year labels.');
  if (authority.yearMultiplierChangesAudibleCarrier !== false) errors.push('Manifest must keep audible gate carriers locked across Elara year labels.');
  if (authority.externalPhysicalGateClaimed !== false) errors.push('Manifest must deny an external physical gate claim.');
  if (authority.releaseFeedsNextCompression !== true) errors.push('Manifest breaks compression of the preceding release.');

  const install = manifest.installContract || {};
  if (install.verifyPremaqcSoundfont !== 'src/premaqc-shokz-soundfont.js') errors.push('Install contract does not require the PREMAQC Shokz soundfont.');
  if (install.verifyTwoShorePremaqcGate !== 'src/two-shore-premaqc-gate.js') errors.push('Install contract does not require the PREMAQC gate.');
  if (install.verifyWorldPremaqcRegistry !== 'src/world-premaqc-registry.js') errors.push('Install contract does not require the PREMAQC world registry.');
  if (!install.verifySchemas?.includes('schemas/premaqc-state-v2.schema.json')) errors.push('Install contract does not require the PREMAQC schema.');

  if (manifest.legacyAliases?.status !== 'compatibility-only') errors.push('Legacy PREMAQ aliases are not explicitly compatibility-only.');
}

if (errors.length) {
  console.error('[PREMAQC Shokz + two-shore gate packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[PREMAQC Shokz + two-shore gate packaging check] OK');
console.log(` PREMAQC soundfont organ: ${arcsweepSoundfontAsset || bifrostSoundfontAsset}`);
console.log(` PREMAQC Feather Stop bridge: ${arcsweepBridgeAsset || bifrostBridgeAsset}`);
console.log(` PREMAQC song organ: ${bifrostSongAsset}`);
console.log(` two-shore PREMAQC panel: ${twoShorePanelAsset}`);
console.log(' dynamic axes: P C R E M A · Q is firsthand context-only and never sonified or compressed');
console.log(' routes: web Arcsweep + Bifröst + DEEP + Groundwire live console');
console.log(' Shokz proxy: 90–360 Hz; gain ceiling 0.018; explicit output confirmation');
console.log(' boundary: unsupported/ungranted fields remain UNKNOWN; no internal iPad haptic claim; no external physical-gate claim');
