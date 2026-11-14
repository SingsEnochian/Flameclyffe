'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
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

  const runtime = path.join(repoRoot, 'apps', 'starwell-server', 'wayglass-runtime');
  await fsp.mkdir(runtime, { recursive: true });
  await fsp.copyFile(path.join(repoRoot, 'netlify/functions/_shared/house-session.mjs'), path.join(runtime, 'house-session.mjs'));
  for (const name of await fsp.readdir(path.join(repoRoot, 'lib'))) {
    if (name.startsWith('wayglass-') && name.endsWith('.cjs')) {
      await fsp.copyFile(path.join(repoRoot, 'lib', name), path.join(runtime, name));
    }
  }

  // WTL preview has local CommonJS dependencies; package the reviewed runtime exactly.
  const wtlDir = path.join(runtime,'wyrdrune');
  await fsp.mkdir(wtlDir,{recursive:true});
  // The integrated voyage's native tensor reference has two local dependencies.
  // Keep these inside the packaged host, not in an external development checkout.
  for (const file of ['tensor-engine.cjs','tensor-ir.cjs']) {
    await fsp.copyFile(path.join(repoRoot,'lib','wyrdrune',file),path.join(wtlDir,file));
  }
  for(const file of ['canonical.cjs','enochian.cjs','wyrdrune.cjs','ritual-ledger.cjs','runtime.mjs','story-soundscape.wtl','full-spectrum.wtl','resonance-atlas.wtl','living-learning.wtl','with-001.wtl','with-002-amber.wtl','with-003-refrain.wtl','with-004-enochian-369.wtl','tensor-ir.cjs','tensor-engine.cjs','tensor-autodiff.cjs','tensor-lowering.cjs','tensor-assurance.cjs','tensor-wtl-bridge.cjs','kernel-divination.cjs','tensor-engine.wtl','coevolution-repair.wtl','coevolution-expand.wtl','mythience-crossing.wtl','mythience-hybrid.wtl']){
    await fsp.copyFile(path.join(repoRoot,'lib','wyrdrune',file),path.join(wtlDir,file));
  }

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
