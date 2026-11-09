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
export const FIRST_CONTACT_URL = 'http://127.0.0.1:5186/';
export const HOST_HEALTH_URL = 'http://127.0.0.1:3000/api/v1/wayglass/healthz';
const ui = FIRST_CONTACT_URL;
const api = HOST_HEALTH_URL;
const mcp = 'http://127.0.0.1:3000/mcp';
const oauthMetadata = 'http://127.0.0.1:3000/.well-known/oauth-protected-resource/mcp';
const oauthPairingFile = path.join(hostDir, 'data', 'wayglass-peer-oauth-pairing.local.txt');
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
export function isWayglassHostHealthy(body) {
  return body?.schema === 'wayglass.host-health/v0.1' && body.status === 'ready';
}
async function hasWayglassAPI() {
  const response = await get(api);
  return !!response && isWayglassHostHealthy(await response.json().catch(() => ({})));
}

// Diagnose two independent places old versions can hide: a Vite server on 5186
// and a healthy but pre-Wyrdrune House host on 3000. The route probe is
// deliberately unauthenticated and sends no story or personal information.
export async function probeLocalSoundscape({fetchImpl=globalThis.fetch}={}) {
  const results={frontend:'offline',host:'offline'};
  try {
    const response=await fetchImpl('http://127.0.0.1:5186/src/surfaces/living-watercolor.js',{
      cache:'no-store',signal:AbortSignal.timeout(1800),
    });
    if(response.ok) {
      const js=await response.text();
      results.frontend=js.includes('wc-score-compose')&&js.includes('wc-score-play')?'current':'stale-or-not-vite';
    }else results.frontend='stale-or-not-vite';
  } catch {}
  try {
    const response=await fetchImpl('http://127.0.0.1:3000/api/v1/wayglass/wyrdrune/story-soundscape',{
      method:'POST',headers:{'content-type':'application/json'},
      body:'{}',cache:'no-store',signal:AbortSignal.timeout(1800),
    });
    // This exact challenge originates at the route itself; no House session
    // or story is needed. Generic 401s from a proxy aren't evidence.
    const text=await response.text();
    results.host=response.status===401&&text.includes('House Steward sign-in required to score the writing room.')
      ?'current':response.status===404?'stale-or-missing-route':'unverified';
  } catch {}
  return Object.freeze(results);
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
  console.log('[Wayglass] Host:', hostIsUp ? 'running' : 'offline');
  console.log('[Wayglass] Ollama:', tags ? 'reachable' : 'offline; visualisation still available');
  console.log('[Wayglass] Local model:', model || '(none detected)');
  const existingUI=!!(await get(ui));
  const soundscape=await probeLocalSoundscape();
  console.log('[Wayglass] Running UI soundscape:',soundscape.frontend);
  console.log('[Wayglass] Running host Wyrdrune route:',soundscape.host);
  if (process.argv.includes('--doctor')) {
    if(soundscape.frontend==='stale-or-not-vite'||soundscape.host==='stale-or-missing-route')
      console.error('[Wayglass] STALE INSTANCE: stop the old server on 5186 or 3000 before launching this checkout.');

    console.log('[Wayglass] Doctor only; no processes started. Open ' + ui + ' once started.');
    return;
  }
  // Never silently attach the current browser to a stale existing frontend
  // or a healthy host that lacks Wyrdrune scoring.
  if(existingUI&&soundscape.frontend!=='current')
    throw new Error('Port 5186 is serving an outdated or unrelated UI. Stop that process and relaunch Wayglass.');
  if(hostIsUp&&soundscape.host!=='current')
    throw new Error('Port 3000 is serving a host without the verified Wyrdrune route. Stop that host and relaunch Wayglass.');
  const env = { ...process.env, ...(model ? { WAYGLASS_LOCAL_MODEL: model } : {}) };
  if (!hostIsUp) {
    launch(process.execPath, [hostEntry], hostDir, env);
    if (!(await ready(hasWayglassAPI))) throw new Error('Wayglass host healthz did not become ready on 3000. Check its output and port conflicts.');
  }
  if (!(await get('http://127.0.0.1:5186/'))) {
    launch(process.execPath, [vite, '--config', 'apps/wayglass/vite.config.js'], root, env);
    if (!(await ready(async () => !!(await get('http://127.0.0.1:5186/'))))) throw new Error('Wayglass Vite did not become ready on 5186.');
  } else {
    console.log('[Wayglass] Port 5186 already responds; verify it is this Wayglass checkout.');
  }
  console.log('\n[Wayglass] OPEN ON THIS WINDOWS COMPUTER:\n' + ui + '\n');
  console.log('Writing Room API: port 3000; Ollama: port 11434.');
  console.log('[Wayglass] ChatGPT MCP local endpoint: ' + mcp);
  console.log('[Wayglass] OAuth metadata: ' + oauthMetadata);
  console.log('[Wayglass] OAuth pairing code file: ' + oauthPairingFile);
  console.log('Ctrl+C stops this launcher.');
}
process.on('SIGINT', () => { stop(); process.exitCode = 0; });
process.on('SIGTERM', () => { stop(); process.exitCode = 0; });
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[Wayglass] ' + error.message); stop(); process.exitCode = 1; });
}
