'use strict';

const path = require('node:path');
const { fork, spawn } = require('node:child_process');

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

function startExternal(label, cwd, scriptPath, extraEnv = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.warn(`[Hearthgate] ${label} exited (${signal || code}). Continuing without it.`);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 100).unref();
}

start('server.js');
start(path.join('fontforge', 'server.js'), { FONTFORGE_PORT: process.env.FONTFORGE_PORT || '3842' });

// Lattice — Earth-event geometry engine; optional, port 4173
const LATTICE_PATH = process.env.LATTICE_PATH ||
  path.resolve(__dirname, '..', '..', '..', '..', 'Downloads', 'Coding Projects', 'Hearthweave Protocol', 'Terra Aeterna', 'lattice');
startExternal('Lattice', LATTICE_PATH, path.join(LATTICE_PATH, 'scripts', 'serve.js'));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of children) if (!child.killed) child.kill();
});
