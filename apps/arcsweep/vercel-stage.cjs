'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const arcsweepSource = path.join(repoRoot, 'dist', 'arcsweep');
const arcsweepDestination = path.join(repoRoot, 'dist', 'starwell', 'arcsweep');
const agentWorkspaceSource = path.join(repoRoot, 'apps', 'agent-workspace');
const agentWorkspaceDestination = path.join(repoRoot, 'dist', 'starwell', 'agents');
const observerSource = path.join(repoRoot, 'starwell', 'deep-observer');
const observerDestination = path.join(repoRoot, 'dist', 'starwell', 'observer');
const resonanceSource = path.join(repoRoot, 'assets', 'deep-resonance-bus.js');
const resonanceDestination = path.join(repoRoot, 'dist', 'starwell', 'assets', 'deep-resonance-bus.js');

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
  const arcsweepIndex = path.join(arcsweepSource, 'index.html');
  const agentWorkspaceIndex = path.join(agentWorkspaceSource, 'index.html');
  const observerIndex = path.join(observerSource, 'index.html');
  if (!fs.existsSync(arcsweepIndex)) {
    throw new Error(`Arcsweep web build missing at: ${arcsweepSource}. Run npm run arcsweep:build first.`);
  }
  if (!fs.existsSync(agentWorkspaceIndex)) {
    throw new Error(`House Workspace source missing at: ${agentWorkspaceSource}.`);
  }
  if (!fs.existsSync(observerIndex)) {
    throw new Error(`DEEP Observer source missing at: ${observerSource}.`);
  }

  await fsp.rm(arcsweepDestination, { recursive: true, force: true });
  await copyTree(arcsweepSource, arcsweepDestination);

  await fsp.rm(agentWorkspaceDestination, { recursive: true, force: true });
  await copyTree(agentWorkspaceSource, agentWorkspaceDestination);

  await fsp.rm(observerDestination, { recursive: true, force: true });
  await copyTree(observerSource, observerDestination);
  if (fs.existsSync(resonanceSource)) {
    await copyTree(resonanceSource, resonanceDestination);
  }

  if (!fs.existsSync(path.join(arcsweepDestination, 'index.html'))) {
    throw new Error(`Arcsweep Vercel stage failed: ${arcsweepDestination}/index.html was not created.`);
  }
  if (!fs.existsSync(path.join(agentWorkspaceDestination, 'index.html'))) {
    throw new Error(`House Workspace Vercel stage failed: ${agentWorkspaceDestination}/index.html was not created.`);
  }
  if (!fs.existsSync(path.join(observerDestination, 'index.html'))) {
    throw new Error(`Observer Vercel stage failed: ${observerDestination}/index.html was not created.`);
  }

  console.log(`[Arcsweep] staged canonical programme ${arcsweepSource} -> ${arcsweepDestination}`);
  console.log(`[House Workspace] staged responsive agent OS ${agentWorkspaceSource} -> ${agentWorkspaceDestination}`);
  console.log(`[Observer] staged DEEP Observer with Arcsweep chamber ${observerSource} -> ${observerDestination}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
