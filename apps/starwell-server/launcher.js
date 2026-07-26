'use strict';

const path = require('node:path');
const { fork } = require('node:child_process');

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
  setTimeout(() => process.exit(code), 100).unref();
}

start('server.js');
start('observer-api.js', { OBSERVER_PORT: process.env.OBSERVER_PORT || '3001' });
start(path.join('fontforge', 'server.js'), { FONTFORGE_PORT: process.env.FONTFORGE_PORT || '3842' });

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of children) if (!child.killed) child.kill();
});
