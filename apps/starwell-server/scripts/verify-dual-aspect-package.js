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
  return html.match(pattern)?.[1] ?? null;
}

function requireAsset(html, label, stem) {
  const asset = findAsset(html, stem);
  if (!asset) errors.push(`Packed ${label} does not load the ${stem} asset.`);
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
requireFile(arcsweepPath, 'web Arcsweep route');
requireFile(continuityPath, 'Arcsweep continuity route');
requireFile(bifrostPath, 'Bifröst route');

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
if (manifest?.engine?.shokzSoundfont !== 'src/premaq-shokz-soundfont.js') {
  errors.push('Packed Bifröst manifest lost the PREMAQ Shokz sound-font entrypoint.');
}
if (manifest?.authorityContract?.renderers !== 'derive-only-no-refetch-after-activation') {
  errors.push('Packed Bifröst manifest lost the renderer no-refetch law.');
}
if (manifest?.authorityContract?.browserCannotDetectOutputDevice !== true) {
  errors.push('Packed Bifröst manifest lost the explicit Shokz output-confirmation boundary.');
}
if (manifest?.authorityContract?.interactionSoundRequiresUserGesture !== true) {
  errors.push('Packed Bifröst manifest lost the deliberate user-gesture requirement.');
}
if (manifest?.authorityContract?.interactionGainCeiling !== 0.018) {
  errors.push('Packed Bifröst manifest has the wrong PREMAQ Shokz gain ceiling.');
}
if (JSON.stringify(manifest?.authorityContract?.shokzProxyBandHz) !== '[90,360]') {
  errors.push('Packed Bifröst manifest has the wrong PREMAQ Shokz proxy band.');
}
if (manifest?.authorityContract?.internalIPadHapticsClaimed !== false) {
  errors.push('Packed Bifröst manifest reintroduced an internal iPad haptic claim.');
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
  'bifrost.premaq-shokz-soundfont-plan/v0.4',
  'CONFIRM_SHOKZ_OUTPUT_FIRST',
  'premaq-shokz-soundfont-dock',
  'bifrost:current-interface-session:v0.4',
]) {
  if (!compiledSource.includes(marker)) {
    errors.push(`Packed STARWELL JavaScript is missing kernel or sound-font marker: ${marker}`);
  }
}

if (fs.existsSync(arcsweepPath) && fs.existsSync(bifrostPath)) {
  const arcsweepHtml = fs.readFileSync(arcsweepPath, 'utf8');
  const bifrostHtml = fs.readFileSync(bifrostPath, 'utf8');

  const arcsweepBridgeAsset = requireAsset(
    arcsweepHtml,
    'web Arcsweep',
    'premaq-shokz-feather-stop-bridge',
  );
  const bifrostBridgeAsset = requireAsset(
    bifrostHtml,
    'Bifröst',
    'premaq-shokz-feather-stop-bridge',
  );
  if (arcsweepBridgeAsset && bifrostBridgeAsset && arcsweepBridgeAsset !== bifrostBridgeAsset) {
    errors.push('Packed web Arcsweep and Bifröst do not share one PREMAQ Shokz bundle.');
  }

  const standaloneSoundfontAssets = [
    findAsset(arcsweepHtml, 'premaq-shokz-soundfont'),
    findAsset(bifrostHtml, 'premaq-shokz-soundfont'),
  ].filter(Boolean);
  if (standaloneSoundfontAssets.length === 2 && standaloneSoundfontAssets[0] !== standaloneSoundfontAssets[1]) {
    errors.push('Packed web Arcsweep and Bifröst load different standalone PREMAQ Shokz assets.');
  }

  const bundleAsset = standaloneSoundfontAssets[0] || bifrostBridgeAsset || arcsweepBridgeAsset;
  if (bundleAsset) {
    const bundlePath = path.join(assetsDir, bundleAsset);
    if (requireFile(bundlePath, 'compiled PREMAQ Shokz bundle')) {
      const bundleSource = fs.readFileSync(bundlePath, 'utf8');
      if (bundleSource.includes('navigator.vibrate')) {
        errors.push('Packed PREMAQ Shokz bundle reintroduced an internal iPad vibration claim.');
      }
      for (const marker of [
        '90–360 Hz',
        '35 chained cycles',
        'GLOBAL FEATHER STOP',
        '#feather-stop',
        '#stop-premaq-song',
        'hearthgate:feather-stop',
      ]) {
        if (!bundleSource.includes(marker)) {
          errors.push(`Packed PREMAQ Shokz bundle is missing marker: ${marker}`);
        }
      }
    }
  }

  for (const [label, html] of [['web Arcsweep', arcsweepHtml], ['Bifröst', bifrostHtml]]) {
    if (!html.includes('viewport-fit=cover')) errors.push(`Packed ${label} is missing iPad safe-area metadata.`);
    if (!html.includes('apple-mobile-web-app-capable')) errors.push(`Packed ${label} is missing Apple standalone metadata.`);
  }
}

if (errors.length) {
  console.error('[Packed dual-aspect verification] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Packed dual-aspect verification] OK');
console.log(` assets scanned: ${jsFiles.length}`);
console.log(' strict packet validation, sealed glyph rendering, activation, Runa, schemas, no-refetch law, Bifröst route, coalesced PREMAQ Shokz bundle, and unified Feather Stop are present');
