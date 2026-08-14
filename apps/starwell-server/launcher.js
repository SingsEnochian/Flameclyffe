'use strict';

const path = require('node:path');
const { fork } = require('node:child_process');
const { parseIgnitionPolicy, executeIgnitionPolicy } = require('./bifrost/ignition-policy');
const { stopSpawnedOllama } = require('./bifrost/ignition');

const children = [];
let shuttingDown = false;

function start(relativePath, extraEnv = {}) {
  const child = fork(path.join(__dirname, relativePath), [], {
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[Hearthgate] ${relativePath} exited unexpectedly (${signal || code}).`);
    shutdown(code || 1);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  stopSpawnedOllama();
  setTimeout(() => process.exit(code), 100).unref();
}

async function applyIgnitionPolicy() {
  const policy = parseIgnitionPolicy(process.env);
  if (!policy.enabled) {
    console.log('[Bifröst] startup ignition disabled; use the Arcsweep ignition panel or npm run bifrost:ignite.');
    return;
  }
  try {
    const result = await executeIgnitionPolicy(policy);
    console.log(`[Bifröst] startup ignition: ${result.state}`);
    for (const receipt of result.receipts || []) {
      const mark = receipt.state === 'runtime-verified' ? '🔥' : '·';
      console.log(`[Bifröst] ${mark} ${receipt.profileId} · ${receipt.state}`);
    }
  } catch (error) {
    console.error(`[Bifröst] startup ignition failed without stopping Hearthgate: ${error?.message || error}`);
  }
}

// Keep the ordinary desktop server behind the same loopback/CORS hardening used
// by start:core. Ignition controls inherit that local boundary through /api/v1.
start('server-secure.js');
start(path.join('fontforge', 'server.js'), { FONTFORGE_PORT: process.env.FONTFORGE_PORT || '3842' });
void applyIgnitionPolicy();

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of children) if (!child.killed) child.kill();
  stopSpawnedOllama();
});
