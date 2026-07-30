'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'dist', 'arcsweep');
const destination = path.join(repoRoot, 'dist', 'starwell', 'arcsweep');

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

(async () => {
  const indexPath = path.join(source, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Arcsweep web build missing at: ${source}. Run npm run arcsweep:build first.`);
  }

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  if (!fs.existsSync(path.join(destination, 'index.html'))) {
    throw new Error(`Arcsweep Vercel stage failed: ${destination}/index.html was not created.`);
  }

  console.log(`[Arcsweep] staged canonical programme ${source} -> ${destination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
