'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const source = path.join(repoRoot, 'dist', 'arcsweep');
const sourceManifest = path.join(repoRoot, 'apps', 'arcsweep', 'manifest.webmanifest');
const sourceModuleManifest = path.join(repoRoot, 'apps', 'arcsweep', 'arcsweep.module.json');
const destination = path.join(__dirname, 'app');

async function copyTree(from, to) {
  const stat = await fsp.stat(from);
  if (stat.isDirectory()) {
    await fsp.mkdir(to, { recursive: true });
    for (const entry of await fsp.readdir(from)) {
      await copyTree(path.join(from, entry), path.join(to, entry));
    }
    return;
  }
  await fsp.mkdir(path.dirname(to), { recursive: true });
  await fsp.copyFile(from, to);
}

async function copyRequiredFile(from, to, label) {
  if (!fs.existsSync(from)) throw new Error(`Arcsweep ${label} source is missing: ${from}`);
  await fsp.mkdir(path.dirname(to), { recursive: true });
  await fsp.copyFile(from, to);
}

(async () => {
  if (!fs.existsSync(path.join(source, 'index.html'))) {
    throw new Error(`Arcsweep web build is missing: ${source}. Run npm run arcsweep:build first.`);
  }

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  // Vite only copies files from a public directory automatically. Arcsweep keeps
  // these canonical metadata files beside its source, so the desktop staging
  // operation must carry them deliberately rather than pretending they appeared.
  await copyRequiredFile(
    sourceManifest,
    path.join(destination, 'manifest.webmanifest'),
    'web manifest',
  );
  await copyRequiredFile(
    sourceModuleManifest,
    path.join(destination, 'arcsweep.module.json'),
    'module manifest',
  );

  const required = ['index.html', 'manifest.webmanifest', 'arcsweep.module.json'];
  for (const file of required) {
    if (!fs.existsSync(path.join(destination, file))) {
      throw new Error(`Staged desktop app is missing ${file}.`);
    }
  }

  console.log(`[Arcsweep] staged ${source} -> ${destination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
