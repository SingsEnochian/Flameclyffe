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
  'server-secure.js',
  'security/local-boundary.js',
  'fontforge/server.js',
  'fontforge/worker.js',
  'scripts/stage-starwell.js',
  'scripts/prepare-assets.js',
  'build/hearthgate.png',
  'public/hearthgate.html',
  'public/hearthgate-archive.html',
  'public/setup-wizard.html',
  'public/starwell/index.html',
  'public/starwell/glyph-studio/index.html',
  'public/starwell/signal-well/index.html',
  'public/starwell/arcsweep-continuity/index.html',
  'public/starwell/modules/signal-well.module.json',
  'public/starwell/modules/bifrost-arcsweep.module.json',
  'public/starwell/modules/signal-well/adapters/radio-jove-live.adapter.json',
  'public/starwell/schemas/premaq-state-v2.schema.json',
  'public/starwell/schemas/bifrost-temporal-state-v1.schema.json',
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
  'public/starwell/arcsweep-continuity/index.html',
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
    if (manifest.moduleId !== 'signal-well') errors.push('Signal Well manifest has the wrong moduleId.');
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

const bifrostManifestPath = path.join(root, 'public', 'starwell', 'modules', 'bifrost-arcsweep.module.json');
if (fs.existsSync(bifrostManifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(bifrostManifestPath, 'utf8'));
    if (manifest.moduleId !== 'bifrost-arcsweep') errors.push('Bifröst Arcsweep manifest has the wrong moduleId.');
    if (manifest.delivery !== 'bundled-core' || manifest.enabledByDefault !== true) {
      errors.push('Bifröst Arcsweep must be declared as an enabled bundled-core module.');
    }
    if (manifest.route !== '/starwell/arcsweep-continuity/' || manifest.entrypoint !== 'arcsweep-continuity/index.html') {
      errors.push('Bifröst Arcsweep manifest has an invalid packaged route or entrypoint.');
    }
    if (manifest.engine?.formalism !== 'temporal-quantum-state-machine' || manifest.engine?.physicalClaim !== false) {
      errors.push('Bifröst Arcsweep must preserve its bounded temporal-quantum interpretation contract.');
    }
    if (!manifest.capabilities?.includes('premaq-v2-ingest') || !manifest.capabilities?.includes('collapse-release-cycles')) {
      errors.push('Bifröst Arcsweep manifest is missing PREMAQ or collapse-release capability.');
    }
    if (manifest.authorityContract?.hearthside !== 'evidence-grounded-observational') {
      errors.push('Bifröst Arcsweep must preserve Hearthside evidence authority.');
    }
    if (manifest.authorityContract?.targetside !== 'canon-grounded-projected') {
      errors.push('Bifröst Arcsweep must preserve Targetside projection authority.');
    }
  } catch (error) {
    errors.push(`Bifröst Arcsweep manifest is invalid JSON: ${error.message}`);
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

for (const [relativePath, expectedId] of [
  ['public/starwell/schemas/premaq-state-v2.schema.json', 'https://flameclyffe.local/schemas/premaq-state-v2.schema.json'],
  ['public/starwell/schemas/bifrost-temporal-state-v1.schema.json', 'https://flameclyffe.local/schemas/bifrost-temporal-state-v1.schema.json'],
]) {
  const schemaPath = path.join(root, relativePath);
  if (!fs.existsSync(schemaPath)) continue;
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    if (schema.$id !== expectedId) errors.push(`${relativePath} has the wrong schema identifier.`);
  } catch (error) {
    errors.push(`${relativePath} is invalid JSON: ${error.message}`);
  }
}

const starwellAssets = path.join(root, 'public', 'starwell', 'assets');
if (!fs.existsSync(starwellAssets) || !fs.statSync(starwellAssets).isDirectory()) {
  errors.push('Bundled STARWELL assets directory is missing.');
} else if (!fs.readdirSync(starwellAssets).some((name) => /\.(js|css)$/i.test(name))) {
  errors.push('Bundled STARWELL assets directory has no JavaScript or CSS assets.');
}

const mainPath = path.join(root, pkg.main || '');
if (fs.existsSync(mainPath)) {
  const mainSource = fs.readFileSync(mainPath, 'utf8');
  for (const requiredFragment of [
    'app.enableSandbox()',
    'safeStorage',
    'sandbox: true',
    'setPermissionRequestHandler',
    'redactHearthgateConfig',
    "path.join(process.resourcesPath, 'app.asar.unpacked')",
  ]) {
    if (!mainSource.includes(requiredFragment)) {
      errors.push(`Electron main process is missing hardening contract: ${requiredFragment}`);
    }
  }
}

const secureServerPath = path.join(root, 'server-secure.js');
if (fs.existsSync(secureServerPath)) {
  const secureServerSource = fs.readFileSync(secureServerPath, 'utf8');
  if (!secureServerSource.includes("'127.0.0.1'")) errors.push('Core server bootstrap must bind to loopback.');
  if (!secureServerSource.includes('localCorsOptions')) errors.push('Core server bootstrap must use the local CORS boundary.');
}

const winTarget = pkg.build?.win?.target;
const targets = Array.isArray(winTarget) ? winTarget : [winTarget].filter(Boolean);
const hasNsis = targets.some((target) => typeof target === 'string' ? target === 'nsis' : target?.target === 'nsis');
if (!hasNsis) errors.push('package.json build.win.target must include NSIS.');

if (pkg.build?.asar !== true) errors.push('package.json build.asar must be true.');
const unpacked = pkg.build?.asarUnpack;
if (!Array.isArray(unpacked)) {
  errors.push('package.json build.asarUnpack must explicitly list runtime files.');
} else {
  for (const requiredPattern of ['server-secure.js', 'security/**', 'fontforge/**', 'public/**', 'node_modules/better-sqlite3/**']) {
    if (!unpacked.includes(requiredPattern)) errors.push(`Missing required asarUnpack pattern: ${requiredPattern}`);
  }
}

const configuredIcon = pkg.build?.win?.icon;
if (!configuredIcon) {
  errors.push('A Windows icon must be configured.');
} else if (!fs.existsSync(path.join(root, configuredIcon))) {
  errors.push(`Configured Windows icon does not exist: ${configuredIcon}`);
}

if (!pkg.description || !pkg.author || !pkg.license) {
  errors.push('package.json must declare description, author, and license metadata.');
}

const packagedFiles = pkg.build?.files;
if (!Array.isArray(packagedFiles)) {
  errors.push('package.json build.files must be an explicit array.');
} else {
  for (const exclusion of ['!.env', '!data/**', '!dist-electron', '!test/**']) {
    if (!packagedFiles.includes(exclusion)) errors.push(`Missing sensitive/generated-file exclusion: ${exclusion}`);
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
console.log(' security: sandboxed renderer + redacted IPC + encrypted config when OS key storage is available');
console.log(' network: core and FontForge services restricted to the local boundary');
console.log(' packaging: ASAR enabled with explicit runtime unpack list and generated Hearthgate icon');
console.log(' framework: /starwell/ + Glyph Studio + Signal Well + Bifröst Arcsweep bundled');
console.log(' schemas: PREMAQ v2 + Bifröst temporal state bundled');
console.log(` installer: ${pkg.build.artifactName}`);
console.log(' signing: not configured; CI output will be unsigned');
