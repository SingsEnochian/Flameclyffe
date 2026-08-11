'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'dist', 'arcsweep');
const destination = path.join(repoRoot, 'apps', 'starwell-server', 'public', 'arcsweep');

const HOST_INJECTION =
  `<script>window.__hearthgateHost=Object.freeze({host:'hearthgate',version:'0.1.0',hostedSince:Date.now()});</script>`;

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
    throw new Error(`Arcsweep web build missing at: ${source}. Run npm run arcsweep:build first.`);
  }

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  // Inject Hearthgate host context before the first script tag so it is
  // available when the Arcsweep module initialises.
  const indexPath = path.join(destination, 'index.html');
  let html = await fsp.readFile(indexPath, 'utf8');
  html = html.replace(/<script/i, `${HOST_INJECTION}\n  <script`);
  await fsp.writeFile(indexPath, html, 'utf8');

  console.log(`[Arcsweep] staged server build ${source} -> ${destination} (host context injected)`);
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
