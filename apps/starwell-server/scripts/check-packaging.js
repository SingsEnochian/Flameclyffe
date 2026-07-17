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
];

for (const relativePath of requiredFiles) {
  if (!relativePath || !fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Missing required packaging file: ${relativePath || '(undefined)'}`);
  }
}

for (const relativePath of ['public/starwell/index.html', 'public/starwell/glyph-studio/index.html']) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  const html = fs.readFileSync(absolutePath, 'utf8');
  if (!html.includes('/starwell/')) {
    errors.push(`${relativePath} does not contain the packaged /starwell/ asset base.`);
  }
}

const starwellAssets = path.join(root, 'public', 'starwell', 'assets');
if (!fs.existsSync(starwellAssets) || !fs.statSync(starwellAssets).isDirectory()) {
  errors.push('Bundled STARWELL assets directory is missing.');
} else if (!fs.readdirSync(starwellAssets).some((name) => /\.(js|css)$/i.test(name))) {
  errors.push('Bundled STARWELL assets directory has no JavaScript or CSS assets.');
}

const electronMainPath = path.join(root, pkg.main);
if (fs.existsSync(electronMainPath)) {
  const electronMain = fs.readFileSync(electronMainPath, 'utf8');
  if (!electronMain.includes('utilityProcess.fork')) {
    errors.push('Electron main process must launch local services with utilityProcess.fork.');
  }
  if (/require\(['"]child_process['"]\)/.test(electronMain) || /\bfork\(serverPath/.test(electronMain)) {
    errors.push('Electron main process must not launch packaged local services with child_process.fork.');
  }
  if (!electronMain.includes('hearthgate-startup.log')) {
    errors.push('Electron main process must expose a persistent startup diagnostics log.');
  }
}

const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
    errors.push('package.json and package-lock.json must declare the same Hearthgate version.');
  }
}

const groveChatPath = path.join(root, 'routes', 'grove-chat.routes.js');
if (fs.existsSync(groveChatPath)) {
  const groveChat = fs.readFileSync(groveChatPath, 'utf8');
  if (!groveChat.includes('process.env.HEARTHGATE_DATA_DIR')) {
    errors.push('Grove chat must store mutable state under HEARTHGATE_DATA_DIR.');
  }
  if (groveChat.includes("path.join(__dirname, '..', 'public', 'uploads')")) {
    errors.push('Grove chat must not create uploads inside the packaged application tree.');
  }
}

const coreServerPath = path.join(root, 'server.js');
if (fs.existsSync(coreServerPath)) {
  const coreServer = fs.readFileSync(coreServerPath, 'utf8');
  if (!coreServer.includes("app.use('/uploads', express.static(uploadsDir))")) {
    errors.push('Core server must serve user uploads from the writable data directory.');
  }
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
console.log(' services: Electron utility processes for core + local FontForge sidecar');
console.log(' diagnostics: persistent hearthgate-startup.log');
console.log(' framework: /starwell/ + /starwell/glyph-studio/ bundled');
console.log(` installer: ${pkg.build.artifactName}`);
console.log(' signing: not configured; CI output will be unsigned');
