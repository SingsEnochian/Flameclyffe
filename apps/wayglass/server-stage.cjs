'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'dist', 'wayglass');
const destination = path.join(repoRoot, 'apps', 'starwell-server', 'public', 'wayglass');

const HOST_CONTEXT_FILENAME = 'wayglass-host.js';
const HOST_CONTEXT_SOURCE =
  "window.__wayglassHost=Object.freeze({host:'hearthgate',version:'0.1.0',hostedSince:Date.now()});\n";
const HOST_INJECTION = `<script src="./${HOST_CONTEXT_FILENAME}"></script>`;

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

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  const indexPath = path.join(destination, 'index.html');
  const hostContextPath = path.join(destination, HOST_CONTEXT_FILENAME);
  await fsp.writeFile(hostContextPath, HOST_CONTEXT_SOURCE, 'utf8');

  let html = await fsp.readFile(indexPath, 'utf8');
  html = html.replace(/<script/i, `${HOST_INJECTION}\n  <script`);
  await fsp.writeFile(indexPath, html, 'utf8');

  console.log(`[Wayglass] staged server build ${source} -> ${destination}`);
  console.log(`[Wayglass] staged CSP-compatible host context -> ${hostContextPath}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
