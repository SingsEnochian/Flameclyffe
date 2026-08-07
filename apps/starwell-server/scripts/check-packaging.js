'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const errors = [];

const resolve = (relativePath) => path.join(root, relativePath);
const exists = (relativePath) => fs.existsSync(resolve(relativePath));
const read = (relativePath) => fs.readFileSync(resolve(relativePath), 'utf8');

function readJson(relativePath, label) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    errors.push(`${label} is invalid JSON: ${error.message}`);
    return null;
  }
}

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
  'public/starwell/world-tone-approval/index.html',
  'public/starwell/modules/signal-well.module.json',
  'public/starwell/modules/bifrost-arcsweep.module.json',
  'public/starwell/modules/signal-well/adapters/radio-jove-live.adapter.json',
  'public/starwell/schemas/premaq-state-v2.schema.json',
  'public/starwell/schemas/bifrost-temporal-state-v1.schema.json',
  'public/starwell/schemas/ipad-somatic-haptic-receipt.schema.json',
];

for (const relativePath of requiredFiles) {
  if (!relativePath || !exists(relativePath)) {
    errors.push(`Missing required packaging file: ${relativePath || '(undefined)'}`);
  }
}

for (const relativePath of [
  'public/starwell/index.html',
  'public/starwell/glyph-studio/index.html',
  'public/starwell/signal-well/index.html',
  'public/starwell/arcsweep-continuity/index.html',
  'public/starwell/world-tone-approval/index.html',
]) {
  if (exists(relativePath) && !read(relativePath).includes('/starwell/')) {
    errors.push(`${relativePath} does not contain the packaged /starwell/ asset base.`);
  }
}

const signalManifestPath = 'public/starwell/modules/signal-well.module.json';
if (exists(signalManifestPath)) {
  const manifest = readJson(signalManifestPath, 'Signal Well manifest');
  if (manifest) {
    if (manifest.moduleId !== 'signal-well') errors.push('Signal Well manifest has the wrong moduleId.');
    if (manifest.delivery !== 'bundled-core' || manifest.enabledByDefault !== true) {
      errors.push('Signal Well must be an enabled bundled-core module.');
    }
    if (manifest.route !== '/starwell/signal-well/' || manifest.entrypoint !== 'signal-well/index.html') {
      errors.push('Signal Well manifest has an invalid packaged route or entrypoint.');
    }
    if (manifest.extensionContract?.discoveryDirectory !== 'modules/signal-well/adapters') {
      errors.push('Signal Well manifest is missing its adapter discovery contract.');
    }
    if (!manifest.extensionContract?.bundledAdapters?.includes('radio-jove-live')) {
      errors.push('Signal Well must bundle the Radio JOVE live adapter.');
    }
    if (!manifest.capabilities?.includes('live-observatory-readings')) {
      errors.push('Signal Well must declare live-observatory-readings.');
    }
  }
}

const bifrostManifestPath = 'public/starwell/modules/bifrost-arcsweep.module.json';
if (exists(bifrostManifestPath)) {
  const manifest = readJson(bifrostManifestPath, 'Bifröst Arcsweep manifest');
  if (manifest) {
    if (manifest.moduleId !== 'bifrost-arcsweep') errors.push('Bifröst Arcsweep manifest has the wrong moduleId.');
    if (manifest.delivery !== 'bundled-core' || manifest.enabledByDefault !== true) {
      errors.push('Bifröst Arcsweep must be an enabled bundled-core module.');
    }
    if (manifest.route !== '/starwell/arcsweep-continuity/' || manifest.entrypoint !== 'arcsweep-continuity/index.html') {
      errors.push('Bifröst Arcsweep manifest has an invalid packaged route or entrypoint.');
    }
    if (manifest.engine?.formalism !== 'braided-reality-compression-release-receiving-spring') {
      errors.push('Bifröst Arcsweep must execute the canonical Braided Spine formalism.');
    }
    if (manifest.spineContract?.schema !== 'hearthgate.braided-spine/v1.1') {
      errors.push('Bifröst Arcsweep must bind the canonical braided-spine v1.1 machine contract.');
    }
    if (manifest.spineContract?.premaqcSchema !== 'hearthgate.premaqc/v1.0') {
      errors.push('Bifröst Arcsweep must bind PREMAQC v1.0.');
    }
    const axes = manifest.spineContract?.premaqcWireOrder ?? [];
    if (JSON.stringify(axes) !== JSON.stringify(['P', 'R', 'E', 'M', 'A', 'Q', 'C'])) {
      errors.push('Bifröst Arcsweep must preserve canonical PREMAQC wire order P R E M A Q C.');
    }
    for (const capability of [
      'braided-spine-v1.1',
      'magic-science-physical-mutual-reinforcement',
      'premaqc-seven-dimensional-living-bearing',
      'premaqc-canonical-wire-premaqc',
      'receiving-spring',
      'answer-return-renewal',
      'compression-release-cycles',
      'compression-of-release-recursion',
      'world-specific-tone-sequences',
      'rowan-owned-tone-approval',
      'ipad-installable-pwa',
    ]) {
      if (!manifest.capabilities?.includes(capability)) {
        errors.push(`Bifröst Arcsweep manifest is missing capability: ${capability}`);
      }
    }
    if (manifest.relationContract?.hearthside !== 'real-participating-shore') {
      errors.push('Bifröst Arcsweep must carry Hearthside as a real participating shore.');
    }
    if (manifest.relationContract?.targetside !== 'real-participating-shore') {
      errors.push('Bifröst Arcsweep must carry Targetside as a real participating shore.');
    }
    if (manifest.relationContract?.releaseFeedsNextCompression !== true) {
      errors.push('Bifröst Arcsweep must feed every release into the next compression.');
    }
    if (manifest.relationContract?.receivingSpringFeedsAnswer !== true) {
      errors.push('Bifröst Arcsweep must feed the Receiving Spring into answer.');
    }
    if (manifest.relationContract?.answerFeedsReturn !== true || manifest.relationContract?.returnFeedsRenewal !== true) {
      errors.push('Bifröst Arcsweep must carry answer through return into renewal.');
    }
    if (manifest.relationContract?.toneApproval !== 'rowan-calibration-owner') {
      errors.push('Bifröst Arcsweep must preserve Rowan tone-calibration authority.');
    }
    if (manifest.installContract?.verifySomaticRoute !== 'world-tone-approval/index.html') {
      errors.push('Bifröst Arcsweep must package the somatic approval route.');
    }
  }
}

const radioPath = 'public/starwell/modules/signal-well/adapters/radio-jove-live.adapter.json';
if (exists(radioPath)) {
  const adapter = readJson(radioPath, 'Radio JOVE adapter');
  if (adapter) {
    if (adapter.adapterId !== 'radio-jove-live' || adapter.kind !== 'live-stream') {
      errors.push('Radio JOVE adapter contract is invalid.');
    }
    if (!adapter.source?.embedUrl || adapter.observation?.audioCenterMHz !== 20.1) {
      errors.push('Radio JOVE adapter is missing its live source or observation metadata.');
    }
  }
}

for (const [relativePath, expectedId] of [
  ['public/starwell/schemas/premaq-state-v2.schema.json', 'https://flameclyffe.local/schemas/premaq-state-v2.schema.json'],
  ['public/starwell/schemas/bifrost-temporal-state-v1.schema.json', 'https://flameclyffe.local/schemas/bifrost-temporal-state-v1.schema.json'],
  ['public/starwell/schemas/ipad-somatic-haptic-receipt.schema.json', 'https://flameclyffe.local/schemas/ipad-somatic-haptic-receipt.schema.json'],
]) {
  if (!exists(relativePath)) continue;
  const schema = readJson(relativePath, relativePath);
  if (schema && schema.$id !== expectedId) errors.push(`${relativePath} has the wrong schema identifier.`);
}

const starwellAssets = resolve('public/starwell/assets');
if (!fs.existsSync(starwellAssets) || !fs.statSync(starwellAssets).isDirectory()) {
  errors.push('Bundled STARWELL assets directory is missing.');
} else if (!fs.readdirSync(starwellAssets).some((name) => /\.(js|css)$/i.test(name))) {
  errors.push('Bundled STARWELL assets directory has no JavaScript or CSS assets.');
}

const mainPath = resolve(pkg.main || '');
if (fs.existsSync(mainPath)) {
  const mainSource = fs.readFileSync(mainPath, 'utf8');
  for (const fragment of [
    'app.enableSandbox()',
    'safeStorage',
    'sandbox: true',
    'setPermissionRequestHandler',
    'redactHearthgateConfig',
    "path.join(process.resourcesPath, 'app.asar.unpacked')",
  ]) {
    if (!mainSource.includes(fragment)) errors.push(`Electron main process is missing hardening contract: ${fragment}`);
  }
}

if (exists('server-secure.js')) {
  const serverSource = read('server-secure.js');
  if (!serverSource.includes("'127.0.0.1'")) errors.push('Core server bootstrap must bind to loopback.');
  if (!serverSource.includes('localCorsOptions')) errors.push('Core server bootstrap must use the local CORS boundary.');
}

const targets = Array.isArray(pkg.build?.win?.target) ? pkg.build.win.target : [pkg.build?.win?.target].filter(Boolean);
const hasNsis = targets.some((target) => typeof target === 'string' ? target === 'nsis' : target?.target === 'nsis');
if (!hasNsis) errors.push('package.json build.win.target must include NSIS.');
if (pkg.build?.asar !== true) errors.push('package.json build.asar must be true.');

const unpacked = pkg.build?.asarUnpack;
if (!Array.isArray(unpacked)) {
  errors.push('package.json build.asarUnpack must explicitly list runtime files.');
} else {
  for (const pattern of ['server-secure.js', 'security/**', 'fontforge/**', 'public/**', 'node_modules/better-sqlite3/**']) {
    if (!unpacked.includes(pattern)) errors.push(`Missing required asarUnpack pattern: ${pattern}`);
  }
}

const configuredIcon = pkg.build?.win?.icon;
if (!configuredIcon) errors.push('A Windows icon must be configured.');
else if (!exists(configuredIcon)) errors.push(`Configured Windows icon does not exist: ${configuredIcon}`);

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
console.log(' spine: Magic <-> Science/Mathematics <-> Physicality');
console.log(' PREMAQC: Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence');
console.log(' law: compression -> release -> receiving spring -> answer -> return -> renewal -> next spiral');
console.log(' security: sandboxed renderer + redacted IPC + encrypted config when OS key storage is available');
console.log(' network: core and FontForge services restricted to the local boundary');
console.log(' framework: STARWELL + Glyph Studio + Signal Well + Bifröst Arcsweep + iPad Somatic Gate bundled');
console.log(' schemas: PREMAQC migration + Bifröst temporal state + iPad somatic receipts bundled');
console.log(` installer: ${pkg.build.artifactName}`);
console.log(' signing: CI output is unsigned');
