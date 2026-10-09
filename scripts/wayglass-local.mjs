#!/usr/bin/env node
// Loopback-only Wayglass launcher. No GPU render, remote publication or automatic model call.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const hostDir = path.join(root, 'apps', 'starwell-server');
const hostEntry = path.join(hostDir, 'server-secure.js');
const ui = 'http://127.0.0.1:5186/?room=observer';
const api = 'http://127.0.0.1:3000/api/v1/wayglass/routes';
const running = [];
let stopping = false;
const sleep = ms => new Promise(done => setTimeout(done, ms));

export function selectLocalModel(names, selected) {
  if (selected) return selected;
  const available = Array.isArray(names) ? names.filter(x => typeof x === 'string' && x.trim()) : [];
  return ['ornith-1.5:9b', 'ornith-1.5', 'codebooga:latest'].find(x => available.includes(x)) || available[0] || null;
}
async function get(url, timeout = 1100) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
    return response.ok ? response : null;
  } catch { return null; }
}
async function hasWayglassAPI() {
  const response = await get(api);
  return !!response && Array.isArray((await response.json().catch(() => ({}))).routes);
}
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of running) if (!child.killed) child.kill();
}
function launch(executable, args, cwd, env) {
  const child = spawn(executable, args, { cwd, env, stdio: 'inherit' });
  running.push(child);
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error('[Wayglass] Child process exited:', signal || code);
      stop();
      process.exitCode = code || 1;
    }
  });
}
async function ready(check, tries = 45) {
  for (let i = 0; i < tries && !stopping; i++) {
    if (await check()) return true;
    await sleep(350);
  }
  return false;
}
async function main() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer required.');
  if (!existsSync(vite)) throw new Error('Missing Vite. Run npm ci in the repository root.');
  if (!existsSync(path.join(hostDir, 'node_modules', 'express'))) throw new Error('Missing Hearthgate dependencies. Run npm ci --prefix apps/starwell-server.');
  const tags = await get('http://127.0.0.1:11434/api/tags');
  const payload = tags ? await tags.json().catch(() => ({})) : {};
  const names = Array.isArray(payload.models) ? payload.models.map(x => x.name).filter(Boolean) : [];
  const model = selectLocalModel(names, process.env.WAYGLASS_LOCAL_MODEL);
  const hostIsUp = await hasWayglassAPI();
  console.log('[Wayglass] Hearthgate:', hostIsUp ? 'running' : 'offline');
  console.log('[Wayglass] Ollama:', tags ? 'reachable' : 'offline; visualisation still available');
  console.log('[Wayglass] Local model:', model || '(none detected)');
  if (process.argv.includes('--doctor')) {
    console.log('[Wayglass] Doctor only; no processes started. Open ' + ui + ' once started.');
    return;
  }
  const env = { ...process.env, ...(model ? { WAYGLASS_LOCAL_MODEL: model } : {}) };
  if (!hostIsUp) {
    launch(process.execPath, [hostEntry], hostDir, env);
    if (!(await ready(hasWayglassAPI))) throw new Error('Hearthgate did not become ready on 3000. Check its output and port conflicts.');
  }
  if (!(await get('http://127.0.0.1:5186/'))) {
    launch(process.execPath, [vite, '--config', 'apps/wayglass/vite.config.js'], root, env);
    if (!(await ready(async () => !!(await get('http://127.0.0.1:5186/'))))) throw new Error('Wayglass Vite did not become ready on 5186.');
  } else {
    console.log('[Wayglass] Port 5186 already responds; verify it is this Wayglass checkout.');
  }
  console.log('\n[Wayglass] OPEN ON THIS WINDOWS COMPUTER:\n' + ui + '\n');
  console.log('Writing Room API: port 3000; Ollama: port 11434. Ctrl+C stops this launcher.');
}
process.on('SIGINT', () => { stop(); process.exitCode = 0; });
process.on('SIGTERM', () => { stop(); process.exitCode = 0; });
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[Wayglass] ' + error.message); stop(); process.exitCode = 1; });
}
