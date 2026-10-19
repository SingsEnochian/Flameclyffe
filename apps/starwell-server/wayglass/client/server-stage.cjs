'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const source = path.join(repoRoot, 'dist', 'wayglass');
const destination = path.join(repoRoot, 'apps', 'starwell-server', 'public', 'wayglass');

const HOST_INJECTION =
  `<script src="./hearthgate-host.js"></script>`;

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

  // The canonical CommonJS runtime is checked into Hearthgate alongside the host.
  // Never copy potentially stale implementations out of root lib/ during staging.
  const runtime = path.join(repoRoot, 'apps', 'starwell-server', 'wayglass-runtime');
  for (const name of ["wayglass-continuation-packet.cjs","wayglass-departure-store.cjs","wayglass-inheritance-context.cjs","wayglass-kernel.cjs","wayglass-model-observation.cjs","wayglass-reasoning-receipt.cjs","wayglass-return-trial.cjs","wayglass-route-registry.cjs","wayglass-stop-receipt.cjs","wayglass-travelling-inheritance.cjs","wayglass-voyage-messages.cjs","wayglass-voyage-runner.cjs","wayglass-waygate.cjs","wayglass-world-entry.cjs"]) {
    await fsp.access(path.join(runtime, name));
  }
  await fsp.access(path.join(runtime, 'house-session.mjs'));

  await fsp.rm(destination, { recursive: true, force: true });
  await copyTree(source, destination);

  await fsp.writeFile(path.join(destination, 'hearthgate-host.js'), "window.__wayglassHost=Object.freeze({host:'hearthgate',version:'0.1.0',hostedSince:Date.now()});\n", 'utf8');

  const indexPath = path.join(destination, 'index.html');
  let html = await fsp.readFile(indexPath, 'utf8');
  html = html.replace(/<script/i, `${HOST_INJECTION}\n  <script`);
  await fsp.writeFile(indexPath, html, 'utf8');

  console.log(`[Wayglass] staged server build ${source} -> ${destination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
