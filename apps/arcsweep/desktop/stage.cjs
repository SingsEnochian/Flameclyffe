'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const source = path.join(repoRoot, 'dist', 'arcsweep');
const destination = path.join(__dirname, 'app');

async function copyTree(from, to) {
  const stat = await fsp.stat(from);
  if (stat.isDirectory()) {
    await fsp.mkdir(to, { recursive: true });
    for (const entry of await fsp.readdir(from)) await copyTree(path.join(from, entry), path.join(to, entry));
    return;
  }
  await fsp.mkdir(path.dirname(to), { recursive: true });
  await fsp.copyFile(from, to);
}

(async () => {
  if (!fs.existsSync(path.join(source, 'index.html'))) {
    throw new Error(`Arcsweep web build is missing: ${source}. Run npm run arcsweep:build first.`);
  }
  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);
  const required = ['index.html', 'manifest.webmanifest'];
  for (const file of required) {
    if (!fs.existsSync(path.join(destination, file))) throw new Error(`Staged desktop app is missing ${file}.`);
  }
  console.log(`[Arcsweep] staged ${source} -> ${destination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
