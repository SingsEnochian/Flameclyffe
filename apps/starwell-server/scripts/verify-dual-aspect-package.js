'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const unpackedRoot = path.join(appRoot, 'dist-electron', 'win-unpacked', 'resources', 'app.asar.unpacked');
const starwellRoot = path.join(unpackedRoot, 'public', 'starwell');
const errors = [];

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing packed ${label}: ${filePath}`);
    return false;
  }
  return true;
}

function readJson(filePath, label) {
  if (!requireFile(filePath, label)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid packed ${label}: ${error.message}`);
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
  if (!asset) errors.push(`Packed ${label} does not load the compiled ${stem} organ.`);
  return asset;
}

const packetSchema = readJson(
  path.join(starwellRoot, 'schemas', 'dual-aspect-packet-v1.schema.json'),
  'DualAspectPacket schema',
);
const receiptSchema = readJson(
  path.join(starwellRoot, 'schemas', 'dual-aspect-receipt-v1.schema.json'),
  'dual-aspect receipt schema',
);
const manifest = readJson(
  path.join(starwellRoot, 'modules', 'bifrost-arcsweep.module.json'),
  'Bifröst manifest',
);

const arcsweepPath = path.join(starwellRoot, 'index.html');
const continuityPath = path.join(starwellRoot, 'arcsweep-continuity', 'index.html');
const bifrostPath = path.join(starwellRoot, 'bifrost', 'index.html');
const deepGroundwirePath = path.join(starwellRoot, 'starwell', 'deep-groundwire-mobius.html');
const deepObserverPath = path.join(starwellRoot, 'starwell', 'deep-observer', 'index.html');
const groundwirePath = path.join(starwellRoot, 'starwell', 'groundwire.html');
requireFile(arcsweepPath, 'web Arcsweep route');
requireFile(continuityPath, 'Arcsweep continuity route');
requireFile(bifrostPath, 'Bifröst route');
requireFile(deepGroundwirePath, 'DEEP + Groundwire live calibration console');
requireFile(deepObserverPath, 'full DEEP Observer route');
requireFile(groundwirePath, 'Groundwire route');

if (packetSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-packet/v1') {
  errors.push('Packed DualAspectPacket schema contract is wrong.');
}
if (receiptSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-receipt/v1') {
  errors.push('Packed receipt schema contract is wrong.');
}
if (manifest?.engine?.kernel !== 'src/hearthweave-kernel/index.js') {
  errors.push('Packed Bifröst manifest lost the strict kernel entrypoint.');
}
if (manifest?.engine?.packetAuthority !== 'hearthweave-kernel') {
  errors.push('Packed Bifröst manifest lost Hearthweave Kernel packet authority.');
}
if (manifest?.engine?.premaqcShokzSoundfont !== 'src/premaqc-shokz-soundfont.js') {
  errors.push('Packed Bifröst manifest lost the canonical PREMAQC Shokz soundfont entrypoint.');
}
if (manifest?.engine?.twoShorePremaqcGate !== 'src/two-shore-premaqc-gate.js') {
  errors.push('Packed Bifröst manifest lost the canonical two-shore PREMAQC gate engine.');
}
if (manifest?.engine?.twoShoreGateUi !== 'src/two-shore-gate-ui.js') {
  errors.push('Packed Bifröst manifest lost the two-shore gate UI.');
}
if (manifest?.engine?.worldPremaqcRegistry !== 'src/world-premaqc-registry.js') {
  errors.push('Packed Bifröst manifest lost the canonical target-world PREMAQC registry.');
}
if (manifest?.authorityContract?.renderers !== 'derive-only-no-refetch-after-activation') {
  errors.push('Packed Bifröst manifest lost the renderer no-refetch law.');
}
if (manifest?.authorityContract?.premaqcCanonicalVocabulary !== true) {
  errors.push('Packed Bifröst manifest lost canonical PREMAQC vocabulary authority.');
}
if (manifest?.authorityContract?.legacyPremaqAliasesCompatibilityOnly !== true) {
  errors.push('Packed Bifröst manifest no longer quarantines PREMAQ aliases as compatibility-only.');
}
if (manifest?.authorityContract?.qualiaSonified !== false || manifest?.authorityContract?.qualiaCompressionFocusAllowed !== false) {
  errors.push('Packed Bifröst manifest no longer keeps Qualia context-only and outside compression/sonification.');
}
if (manifest?.authorityContract?.browserCannotDetectOutputDevice !== true) {
  errors.push('Packed Bifröst manifest lost the explicit Shokz output-confirmation boundary.');
}
if (manifest?.authorityContract?.interactionSoundRequiresUserGesture !== true) {
  errors.push('Packed Bifröst manifest lost the deliberate user-gesture requirement.');
}
if (manifest?.authorityContract?.interactionGainCeiling !== 0.018) {
  errors.push('Packed Bifröst manifest has the wrong PREMAQC Shokz gain ceiling.');
}
if (JSON.stringify(manifest?.authorityContract?.shokzProxyBandHz) !== '[90,360]') {
  errors.push('Packed Bifröst manifest has the wrong PREMAQC Shokz proxy band.');
}
if (manifest?.authorityContract?.internalIPadHapticsClaimed !== false) {
  errors.push('Packed Bifröst manifest reintroduced an internal iPad haptic claim.');
}
if (manifest?.authorityContract?.liveGateRequiresDeepAndGroundwire !== true) {
  errors.push('Packed Bifröst manifest lost the DEEP + Groundwire LIVE requirement.');
}
if (JSON.stringify(manifest?.authorityContract?.lockedGateToneAxes) !== '["P","R","E","M","A"]') {
  errors.push('Packed Bifröst manifest has the wrong locked dynamic gate tone axes.');
}
if (manifest?.authorityContract?.bridgeCoherenceAxis !== 'C') {
  errors.push('Packed Bifröst manifest lost the C bridge-coherence channel.');
}
if (manifest?.authorityContract?.gateBaseCycles !== 369) {
  errors.push('Packed Bifröst manifest has the wrong 369 base cycle.');
}
if (JSON.stringify(manifest?.authorityContract?.gateExtensionCycles) !== '[3,6,9]') {
  errors.push('Packed Bifröst manifest has the wrong +3 +6 +9 continuation sequence.');
}
if (JSON.stringify(manifest?.authorityContract?.elaraYearLabels) !== '[2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035]') {
  errors.push('Packed Bifröst manifest has the wrong Elara year labels.');
}
if (manifest?.authorityContract?.yearMultiplierChangesAudibleCarrier !== false) {
  errors.push('Packed Bifröst manifest allows silent annual drift of locked audible carriers.');
}
if (manifest?.authorityContract?.externalPhysicalGateClaimed !== false) {
  errors.push('Packed Bifröst manifest reintroduced an external physical-gate claim.');
}

const assetsDir = path.join(starwellRoot, 'assets');
const jsFiles = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(assetsDir, name))
  : [];
const compiledSource = jsFiles
  .map((filePath) => fs.readFileSync(filePath, 'utf8'))
  .join('\n');

for (const marker of [
  'hearthweave.dual-aspect-packet/v1',
  'hearthweave:dual-aspect-activation',
  'runa:dual-aspect-tone-activation',
  'hearthweave.packet-glyph-render/v1',
  'missing-correspondence-binding',
  'bifrost.premaqc-shokz-soundfont-plan/v1',
  'hearthgate.two-shore-premaqc-gate/v1',
  'PREMAQC',
  'CONFIRM_SHOKZ_OUTPUT_FIRST',
  'EARTH PRIME SHORE ⇄ TARGET-WORLD SHORE',
  'LIVE GATE TEST · 2025',
  'Run 2025→2035',
  'TWO_SHORE_GATE_LINEAGE_MISMATCH',
]) {
  if (!compiledSource.includes(marker)) {
    errors.push(`Packed STARWELL JavaScript is missing kernel, PREMAQC soundfont, or two-shore gate marker: ${marker}`);
  }
}

if (fs.existsSync(arcsweepPath) && fs.existsSync(bifrostPath)) {
  const arcsweepHtml = fs.readFileSync(arcsweepPath, 'utf8');
  const bifrostHtml = fs.readFileSync(bifrostPath, 'utf8');

  const arcsweepBridgeAsset = requireAsset(
    arcsweepHtml,
    'web Arcsweep',
    'premaqc-shokz-feather-stop-bridge',
  );
  const bifrostBridgeAsset = requireAsset(
    bifrostHtml,
    'Bifröst',
    'premaqc-shokz-feather-stop-bridge',
  );
  if (arcsweepBridgeAsset && bifrostBridgeAsset && arcsweepBridgeAsset !== bifrostBridgeAsset) {
    errors.push('Packed web Arcsweep and Bifröst do not share one canonical PREMAQC Shokz/Feather Stop bundle.');
  }

  const soundfontAssets = [
    findAsset(arcsweepHtml, 'premaqc-shokz-soundfont'),
    findAsset(bifrostHtml, 'premaqc-shokz-soundfont'),
  ].filter(Boolean);
  if (soundfontAssets.length === 2 && soundfontAssets[0] !== soundfontAssets[1]) {
    errors.push('Packed web Arcsweep and Bifröst resolve different PREMAQC Shokz soundfont organs.');
  }

  const bundleAsset = soundfontAssets[0] || bifrostBridgeAsset || arcsweepBridgeAsset;
  if (bundleAsset) {
    const bundlePath = path.join(assetsDir, bundleAsset);
    if (requireFile(bundlePath, 'compiled PREMAQC Shokz and two-shore gate bundle')) {
      const bundleSource = fs.readFileSync(bundlePath, 'utf8');
      if (bundleSource.includes('navigator.vibrate')) {
        errors.push('Packed shared PREMAQC bundle reintroduced an internal iPad vibration claim.');
      }
      for (const marker of [
        'bifrost.premaqc-shokz-soundfont-plan/v1',
        'hearthgate.premaqc-shokz-feather-stop-bridge/v1',
        'hearthgate.two-shore-premaqc-gate/v1',
        'PREMAQC',
        '90–360 Hz',
        '35 chained cycles',
        'GLOBAL FEATHER STOP',
        '#feather-stop',
        'hearthgate:feather-stop',
        'LIVE GATE TEST · 2025',
        'Run 2025→2035',
      ]) {
        if (!bundleSource.includes(marker)) {
          errors.push(`Packed shared PREMAQC bundle is missing marker: ${marker}`);
        }
      }
    }
  }

  const bifrostPanelAsset = requireAsset(bifrostHtml, 'Bifröst', 'two-shore-premaqc');
  if (bifrostPanelAsset) {
    const panelPath = path.join(assetsDir, bifrostPanelAsset);
    if (requireFile(panelPath, 'compiled two-shore PREMAQC panel')) {
      const panelSource = fs.readFileSync(panelPath, 'utf8');
      for (const marker of ['bifrost.two-shore-premaqc-panel/v1', 'qualia_compression_focus_allowed', 'PREMAQC']) {
        if (!panelSource.includes(marker)) errors.push(`Packed two-shore PREMAQC panel is missing marker: ${marker}`);
      }
    }
  }

  for (const [label, html] of [['web Arcsweep', arcsweepHtml], ['Bifröst', bifrostHtml]]) {
    if (!html.includes('viewport-fit=cover')) errors.push(`Packed ${label} is missing iPad safe-area metadata.`);
    if (!html.includes('apple-mobile-web-app-capable')) errors.push(`Packed ${label} is missing Apple standalone metadata.`);
  }
}

if (errors.length) {
  console.error('[Packed dual-aspect and canonical PREMAQC verification] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Packed dual-aspect and canonical PREMAQC verification] OK');
console.log(` assets scanned: ${jsFiles.length}`);
console.log(' strict packet validation, sealed glyph rendering, activation, Runa, schemas, no-refetch law, Bifröst route, live DEEP/Groundwire routes, canonical PREMAQC bundle graph, and unified Feather Stop are present');
