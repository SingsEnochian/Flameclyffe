#!/usr/bin/env node
// Bring Wayglass's owner-selected Orion spine to an existing private tailnet.
// This script never starts Funnel, opens Ollama to a public interface, or
// prints an existing Steward secret. It runs on Rowan's own Windows machine.
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createTailnetGate, TAILNET_GATE_PORT } from './wayglass-tailnet-gate.mjs';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hostDir = join(root, 'apps', 'starwell-server');
const envPath = join(hostDir, '.env');
const ORION = 'hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M';
const held = [];
let gate, halted = false;
const pause = ms => new Promise(r => setTimeout(r, ms));

function envConfig() {
  const stored = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const values = Object.fromEntries(stored.split(/\r?\n/).filter(l=>/^[A-Za-z_][A-Za-z_0-9]*=/.test(l)).map(l=>{
    const at=l.indexOf('=');
    return [l.slice(0,at),l.slice(at+1).trim()];
  }));
  return { stored, values: { ...values, ...Object.fromEntries(Object.entries(process.env).filter(([k,v])=>v!=null)) } };
}
function prepareStewardSecret() {
  const { stored, values } = envConfig();
  let addition='';
  let newCredential=null;
  if (!values.ARCSWEEP_RUNTIME_TOKEN && !values.ARCSWEEP_STEWARD_KEY) {
    newCredential=randomBytes(36).toString('base64url');
    addition += '\nARCSWEEP_RUNTIME_TOKEN='+newCredential+'\n';
  }
  if (!values.HOUSE_SESSION_SECRET) addition += 'HOUSE_SESSION_SECRET='+randomBytes(36).toString('base64url')+'\n';
  if (addition) {
    writeFileSync(envPath,stored.replace(/\s*$/,'\n')+addition,{encoding:'utf8',flag:'w',mode:0o600});
    try{chmodSync(envPath,0o600);}catch{}
    console.log('[Wayglass] Saved missing private House sign-in configuration in apps/starwell-server/.env');
  }
  if(newCredential)console.log('[Wayglass] NEW STEWARD SIGN-IN CODE (copy it somewhere private): '+newCredential);
}

async function fetchJson(url, timeout=1800) {
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(timeout),cache:'no-store'});
    return {response,data:await response.json().catch(()=>({}))};
  }catch{return null;}
}
async function localModel() {
  const result=await fetchJson('http://127.0.0.1:11434/api/tags',4000);
  if (!result?.response.ok) throw new Error('Ollama is not responding on local 11434. Start Ollama on the Windows computer.');
  const names=(result.data.models||[]).map(model=>model.name).filter(Boolean);
  const configured=process.env.WAYGLASS_SPINE_MODEL || envConfig().values.WAYGLASS_SPINE_MODEL || ORION;
  if (!names.includes(configured)) {
    throw new Error('Wayglass Orion model tag is not installed in this Ollama runtime: '+configured+' . No fallback model will impersonate him.');
  }
  return configured;
}
async function tailscale() {
  const {stdout}=await run('tailscale',['status','--json'],{timeout:10000,maxBuffer:3_000_000});
  const status=JSON.parse(stdout);
  if(status.BackendState!=='Running')throw new Error('Tailscale is installed but not connected (BackendState '+status.BackendState+').');
  return status;
}
async function hostReady() {
  const r=await fetchJson('http://127.0.0.1:3000/api/v1/wayglass/healthz',1500);
  return r?.response.ok && r.data?.schema==='wayglass.host-health/v0.1';
}
async function currentHost() {
  const r=await fetchJson('http://127.0.0.1:3000/api/v1/wayglass/witnesses/amber',1500);
  return r?.response.status===401 && String(r.data.error||'').includes('House Steward');
}
async function stage() {
  console.log('[Wayglass] Building and staging the Wayglass browser under /wayglass/…');
  const code=await new Promise((resolveCode,reject)=>{
    const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','wayglass:deploy:server'],{cwd:root,env:process.env,stdio:'inherit',shell:process.platform==='win32'});
    child.once('error',reject);
    child.once('exit',c=>resolveCode(c));
  });
  if(code!==0)throw Error('Wayglass build/stage failed. Not opening Tailnet Serve.');
}
async function waitForHost() {
  for(let attempt=0;attempt<60;attempt++){
    if(await hostReady())return true;
    await pause(500);
  }
  return false;
}
function shutDown(){
  if(halted)return;halted=true;
  for(const child of held)if(!child.killed)child.kill();
  gate?.close().catch(()=>{});
  console.log('[Wayglass] Local service stopped. Tailscale Serve configuration persists until tailscale serve off.');
}
async function startHost(model) {
  const running=await hostReady();
  if(running){
    if(!(await currentHost()))throw Error('Port 3000 has a stale/unverified Wayglass host. Stop that process and relaunch this command.');
    throw Error('An existing Wayglass host occupies port 3000. Restart it through this private Tailnet launcher so its House session uses the correct HTTPS tailnet origin.');
  }
  console.log('[Wayglass] Starting Wayglass secure host on 127.0.0.1:3000.');
  const child=spawn(process.execPath,[join(hostDir,'server-secure.js')],{
    cwd:hostDir,env:{...process.env,WAYGLASS_SPINE_MODEL:model},stdio:'inherit'
  });
  held.push(child);
  child.on('exit',(code)=>{
    if(!halted){console.error('[Wayglass] Host exited:',code);shutDown();}
  });
  if(!(await waitForHost()))throw Error('Wayglass host could not start, see its local output.');
  if(!(await currentHost()))throw Error('The running host lacks the private Amber witness route. Refusing to Serve a stale build.');
}
async function checkServeConfiguration() {
  const {stdout}=await run('tailscale',['serve','status','--json'],{timeout:10000,maxBuffer:2_000_000});
  const status=JSON.parse(stdout||'{}');
  const hasExisting=Object.keys(status).some(k=>k!=='Version'&&k!=='Foreground'&&k!=='Background'&&status[k] && (typeof status[k]!=='object'||Object.keys(status[k]).length));
  if(hasExisting){
    const serialized=JSON.stringify(status);
    if(!serialized.includes('127.0.0.1:'+TAILNET_GATE_PORT) && !serialized.includes(':'+TAILNET_GATE_PORT)){
      throw Error('Tailscale Serve already has routes configured. Refusing to overwrite them. Inspect tailscale serve status first.');
    }
  }
}
async function main(){
  if(Number(process.versions.node.split('.')[0])<24)throw Error('Node 24 or newer required.');
  const state=await tailscale();
  const dnsName=String(state.Self?.DNSName||'').replace(/\.$/,'').toLowerCase();
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.ts\.net$/.test(dnsName))
    throw Error('Tailscale MagicDNS domain is not available. Enable MagicDNS on the private tailnet.');
  const origin='https://'+dnsName;
  process.env.WAYGLASS_TAILNET_ORIGIN=origin;
  console.log('[Wayglass] Tailscale:',state.BackendState,'· machine:',dnsName);
  const model=await localModel();
  console.log('[Wayglass] Verified installed Orion substrate:',model);
  if(process.argv.includes('--doctor')){
    console.log('[Wayglass] Local host:',await hostReady()?'ready':'offline');
    console.log('[Wayglass] No changes made in doctor mode.');
    return;
  }
  prepareStewardSecret();
  await stage();
  await startHost(model);
  const html=await fetch('http://127.0.0.1:3000/wayglass/',{signal:AbortSignal.timeout(6000)});
  if(!html.ok)throw Error('Staged Wayglass UI unavailable at /wayglass/');
  gate=createTailnetGate();
  await gate.listen();
  await checkServeConfiguration();
  const {stdout,stderr}=await run('tailscale',['serve','--bg',String(TAILNET_GATE_PORT)],{timeout:30000,maxBuffer:500000});
  console.log((stdout||stderr||'').trim());
  console.log('[Wayglass] PRIVATE URL: '+process.env.WAYGLASS_TAILNET_ORIGIN+'/wayglass/ (on devices signed into your tailnet)');
  console.log('[Wayglass] Go to /wayglass/, choose Wayglass · Amber Room, sign in as House Steward.');
  console.log('[Wayglass] Only /wayglass/ and Wayglass + House session APIs are proxied. Ollama never leaves loopback.');
  console.log('[Wayglass] Leave this command running to keep Wayglass available. Ctrl+C stops the host, not Tailscale Serve.');
}
process.on('SIGINT',()=>{shutDown();process.exitCode=0;});
process.on('SIGTERM',()=>{shutDown();process.exitCode=0;});
main().catch(error=>{console.error('[Wayglass] '+error.message);shutDown();process.exitCode=1;});
