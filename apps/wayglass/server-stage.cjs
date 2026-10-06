'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'dist', 'wayglass');
const destination = path.join(repoRoot, 'apps', 'starwell-server', 'public', 'wayglass');

const HOST_INJECTION =
  `<script>window.__wayglassHost=Object.freeze({host:'hearthgate',version:'0.1.0',hostedSince:Date.now()});</script>`;

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
  if (!fs.existsSync(path.join(source, 'index.html'))) {
    throw new Error(`Wayglass web build missing at: ${source}. Run npm run wayglass:build first.`);
  }

  const runtime = path.join(repoRoot, 'apps', 'starwell-server', 'wayglass-runtime');
  await fsp.mkdir(runtime, { recursive: true });
  for (const name of await fsp.readdir(path.join(repoRoot, 'lib'))) {
    if (name.startsWith('wayglass-') && name.endsWith('.cjs')) {
      await fsp.copyFile(path.join(repoRoot, 'lib', name), path.join(runtime, name));
    }
  }

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  const indexPath = path.join(destination, 'index.html');
  let html = await fsp.readFile(indexPath, 'utf8');
  html = html.replace(/<script/i, `${HOST_INJECTION}\n  <script`);
  await fsp.writeFile(indexPath, html, 'utf8');

  console.log(`[Wayglass] staged server build ${source} -> ${destination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
