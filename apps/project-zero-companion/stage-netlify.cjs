'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'dist', 'project-zero-companion');
const destination = path.join(repoRoot, 'dist', 'starwell', 'project-zero-companion');

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

async function filesUnder(root) {
  const out = [];
  for (const entry of await fsp.readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(full));
    else out.push(full);
  }
  return out;
}

(async () => {
  const index = path.join(source, 'index.html');
  if (!fs.existsSync(index)) throw new Error(`Project Zero Companion build missing at ${source}. Run npm run project-zero:build first.`);
  const html = await fsp.readFile(index, 'utf8');
  if (!html.includes('/project-zero-companion/')) {
    throw new Error('Project Zero Companion must be built for the canonical /project-zero-companion/ production base.');
  }

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  const stagedIndex = path.join(destination, 'index.html');
  if (!fs.existsSync(stagedIndex)) throw new Error('Project Zero Companion Netlify stage did not produce index.html.');
  const assets = await filesUnder(destination);
  let greatBraidPresent = false;
  for (const file of assets.filter((item) => /\.(?:js|html)$/i.test(item))) {
    const content = await fsp.readFile(file, 'utf8');
    if (content.includes('arcsweep.great-braid.receipted')) { greatBraidPresent = true; break; }
  }
  if (!greatBraidPresent) throw new Error('Project Zero Companion stage is missing the Great Braid receipt rail.');

  console.log(`[Project Zero] staged production companion ${source} -> ${destination}`);
  console.log('[Project Zero] route /project-zero-companion/ · Great Braid rail present');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
