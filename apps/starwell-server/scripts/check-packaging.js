'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const errors = [];
const requiredFiles = [
  pkg.main,
  'electron/preload.js',
  'launcher.js',
  'server.js',
  'fontforge/server.js',
  'fontforge/worker.js',
  'scripts/stage-starwell.js',
  'lib/hearthfire-ingest.js',
  'lib/api-registry.js',
  'lib/hearthfire-analysis.js',
  'lib/glyph-matrix.js',
  'lib/glyph-live.js',
  'lib/writer-store.js',
  'lib/continuity-store.js',
  'lib/tone-store.js',
  'lib/almanac-store.js',
  'lib/deep-story-store.js',
  'lib/module-registry.js',
  'lib/concordance.js',
  'lib/solar-weather-store.js',
  'seed-data/rooms.json',
  'seed-data/bridges.json',
  'seed-data/signals.json',
  'seed-data/modules.json',
  'public/hearthgate.html',
  'public/hearthgate-shell.html',
  'public/hearthgate-tones.html',
  'public/hearthgate-apps.html',
  'public/continuity-room.html',
  'public/almanac.html',
  'public/deep-story.html',
  'public/concordance.html',
  'public/laboratory.html',
  'public/solar-observatory.html',
  'public/writer.html',
  'public/laboratory/glass-material-manager.js',
  'public/laboratory/dispersion.js',
  'public/laboratory/advanced-glass-manager.js',
  'public/laboratory/glass-render-pipeline.js',
  'public/laboratory/scratch-generator.js',
  'public/laboratory/hdr-environment.js',
  'public/laboratory/vertex-ripples.js',
  'public/laboratory/mobile-performance.js',
  'public/laboratory/observer-glass.js',
  'public/hearthgate-archive.html',
  'public/setup-wizard.html',
  'public/starwell/index.html',
  'public/starwell/glyph-studio/index.html',
  'public/starwell/signal-well/index.html',
  'public/starwell/modules/signal-well.module.json',
  'public/starwell/modules/signal-well/adapters/radio-jove-live.adapter.json',
];

for (const relativePath of requiredFiles) {
  if (!relativePath || !fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Missing required packaging file: ${relativePath || '(undefined)'}`);
  }
}

for (const relativePath of [
  'public/starwell/index.html',
  'public/starwell/glyph-studio/index.html',
  'public/starwell/signal-well/index.html',
]) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  const html = fs.readFileSync(absolutePath, 'utf8');
  if (!html.includes('/starwell/')) {
    errors.push(`${relativePath} does not contain the packaged /starwell/ asset base.`);
  }
}

const signalWellManifestPath = path.join(root, 'public', 'starwell', 'modules', 'signal-well.module.json');
if (fs.existsSync(signalWellManifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(signalWellManifestPath, 'utf8'));
    if (manifest.moduleId !== 'signal-well') {
      errors.push('Signal Well manifest has the wrong moduleId.');
    }
    if (manifest.delivery !== 'bundled-core' || manifest.enabledByDefault !== true) {
      errors.push('Signal Well must be declared as an enabled bundled-core module.');
    }
    if (manifest.route !== '/starwell/signal-well/' || manifest.entrypoint !== 'signal-well/index.html') {
      errors.push('Signal Well manifest has an invalid packaged route or entrypoint.');
    }
    if (manifest.extensionContract?.discoveryDirectory !== 'modules/signal-well/adapters') {
      errors.push('Signal Well manifest is missing the optional adapter discovery contract.');
    }
    if (!manifest.extensionContract?.bundledAdapters?.includes('radio-jove-live')) {
      errors.push('Signal Well must bundle the Radio JOVE live adapter.');
    }
    if (!manifest.capabilities?.includes('live-observatory-readings')) {
      errors.push('Signal Well manifest must declare live-observatory-readings.');
    }
  } catch (error) {
    errors.push(`Signal Well manifest is invalid JSON: ${error.message}`);
  }
}

const radioJoveAdapterPath = path.join(
  root,
  'public',
  'starwell',
  'modules',
  'signal-well',
  'adapters',
  'radio-jove-live.adapter.json',
);
if (fs.existsSync(radioJoveAdapterPath)) {
  try {
    const adapter = JSON.parse(fs.readFileSync(radioJoveAdapterPath, 'utf8'));
    if (adapter.adapterId !== 'radio-jove-live' || adapter.kind !== 'live-stream') {
      errors.push('Radio JOVE adapter contract is invalid.');
    }
    if (!adapter.source?.embedUrl || adapter.observation?.audioCenterMHz !== 20.1) {
      errors.push('Radio JOVE adapter is missing its live source or observation metadata.');
    }
  } catch (error) {
    errors.push(`Radio JOVE adapter is invalid JSON: ${error.message}`);
  }
}

const starwellAssets = path.join(root, 'public', 'starwell', 'assets');
if (!fs.existsSync(starwellAssets) || !fs.statSync(starwellAssets).isDirectory()) {
  errors.push('Bundled STARWELL assets directory is missing.');
} else if (!fs.readdirSync(starwellAssets).some((name) => /\.(js|css)$/i.test(name))) {
  errors.push('Bundled STARWELL assets directory has no JavaScript or CSS assets.');
}

const winTarget = pkg.build?.win?.target;
const targets = Array.isArray(winTarget) ? winTarget : [winTarget].filter(Boolean);
const hasNsis = targets.some((target) => {
  if (typeof target === 'string') return target === 'nsis';
  return target?.target === 'nsis';
});

if (!hasNsis) {
  errors.push('package.json build.win.target must include NSIS.');
}

const configuredIcon = pkg.build?.win?.icon;
if (configuredIcon && !fs.existsSync(path.join(root, configuredIcon))) {
  errors.push(`Configured Windows icon does not exist: ${configuredIcon}`);
}

const packagedFiles = pkg.build?.files;
if (!Array.isArray(packagedFiles)) {
  errors.push('package.json build.files must be an explicit array.');
} else {
  const requiredExclusions = ['!.env', '!data/**', '!dist-electron'];
  for (const exclusion of requiredExclusions) {
    if (!packagedFiles.includes(exclusion)) {
      errors.push(`Missing sensitive/generated-file exclusion: ${exclusion}`);
    }
  }
}

if (!pkg.build?.artifactName?.includes('${version}') || !pkg.build?.artifactName?.includes('${arch}')) {
  errors.push('build.artifactName must include version and architecture.');
}

if (errors.length) {
  console.error('[Hearthgate packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Hearthgate packaging check] OK');
console.log(` product: ${pkg.productName}`);
console.log(` version: ${pkg.version}`);
console.log(` main: ${pkg.main}`);
console.log(' services: core + local FontForge sidecar');
console.log(' first light: per-user data seed + provenance catalogue + receipts');
console.log(' ingestion: PDF + DOCX + text formats + bundled local image OCR');
console.log(' analysis: deliberate per-source/batch semantic analysis through a chosen configured provider');
console.log(' writing room: long-form autosave + tone/canon metadata + source-derived editable copies + export');
console.log(' continuity: persistent cross-source threads + provenance-aware derived metrics + explicit boundaries');
console.log(' tone lab: configurable consent-gated visual/audio/haptic patches + private response records');
console.log(' almanac: observation + vector + glyph + narrative + privacy + source receipt packets');
console.log(' DEEPStory: source-required parallel narrative records + append-only revisions');
console.log(' concordance: original source text + continuity + almanac + writing + story search');
console.log(' solar observatory: sourced NOAA SWPC measurements + freshness + history + alerts; no causal inference');
console.log(' glyph matrix: provenance-bearing PREMAQ aggregation + same-service WebSocket updates; no simulated live sources');
console.log(' API registry: readiness only; secret values remain in Electron userData');
console.log(' product home: Hearthgate; primary instrument: Nocturne-protocol Laboratory + persistent Home route');
console.log(' framework: /starwell/ + /starwell/glyph-studio/ + /starwell/signal-well/ bundled');
console.log(' modules: Signal Well core + Radio JOVE live listening bundled; specialist adapters optional');
console.log(' boundary: Glyph Studio and FontForge bridge are experimental foundations, not a finished glyph-to-font art system');
console.log(' forge: Unicode/geometry preflight + fitted metrics + GPOS kerning + GSUB ligatures + source/compiled proofing');
console.log(` installer: ${pkg.build.artifactName}`);
console.log(' signing: not configured; CI output will be unsigned');
