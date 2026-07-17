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
  'public/hearthgate.html',
  'public/hearthgate-archive.html',
  'public/setup-wizard.html',
  'public/starwell/index.html',
  'public/starwell/glyph-studio/index.html',
  'public/starwell/signal-well/index.html',
  'public/starwell/modules/signal-well.module.json',
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
  } catch (error) {
    errors.push(`Signal Well manifest is invalid JSON: ${error.message}`);
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
console.log(' framework: /starwell/ + /starwell/glyph-studio/ + /starwell/signal-well/ bundled');
console.log(' modules: Signal Well core bundled; hardware, archive, decoder, and sonification adapters optional');
console.log(` installer: ${pkg.build.artifactName}`);
console.log(' signing: not configured; CI output will be unsigned');
