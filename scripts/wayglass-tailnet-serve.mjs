#!/usr/bin/env node
// Tailnet-private first voyage: a foreground Tailscale Serve session to the
// route-limited Wayglass gate. No Funnel, no direct port 3000 exposure.
import {spawn} from 'node:child_process';
import http from 'node:http';
import {createTailnetGate,TAILNET_GATE_PORT} from './wayglass-tailnet-gate.mjs';

const gatewayOnly = process.argv.includes('--gateway-only');
const origin=String(process.env.WAYGLASS_TAILNET_ORIGIN||'');
if (!gatewayOnly || origin) {
  let url;
  try { url=new URL(origin); }
  catch { throw Error('Verified WAYGLASS_TAILNET_ORIGIN is required'); }
  if(url.protocol!=='https:'||!url.hostname.endsWith('.ts.net')||
     url.pathname!=='/'||url.port||url.username||url.password||url.search||url.hash){
    throw Error('Invalid verified Tailscale HTTPS origin');
  }
}
const gate=createTailnetGate();
let child,closing=false,ownsGate=false;
async function close(){
  if(closing)return;
  closing=true;
  if(child&&!child.killed)child.kill();
  if (ownsGate) await gate.close().catch(()=>{});
}
process.once('SIGINT',()=>{void close().then(()=>{process.exitCode=0;});});
process.once('SIGTERM',()=>{void close().then(()=>{process.exitCode=0;});});
try{
  try {
    await gate.listen();
    ownsGate = true;
  } catch (error) {
    if (gatewayOnly || error.code !== 'EADDRINUSE') throw error;
    // An existing Wayglass custom-domain gateway may also serve the tailnet.
    const sharedGate = await new Promise((resolve, reject) => {
      const probe = http.get({
        host: '127.0.0.1', port: TAILNET_GATE_PORT, path: '/wayglass/',
        headers: { Host: 'wayglass.world' }, timeout: 3000,
      }, response => {
        response.resume();
        resolve(response.statusCode === 401 && response.headers['x-wayglass-access-gate'] === 'enabled');
      });
      probe.once('timeout', () => probe.destroy(new Error('Gateway probe timed out')));
      probe.once('error', reject);
    });
    if (!sharedGate) {
      throw Error('Port 32861 is occupied by a process other than the Access-enabled Wayglass gateway');
    }
  }
  // A remote browser cannot reach STARWELL's unrelated endpoints through this
  // gateway. Verify the path boundary before opening a tailnet route.
  const blocked=await fetch('http://127.0.0.1:'+TAILNET_GATE_PORT+'/api/boxfire/status');
  if(blocked.status!==404)throw Error('Tailnet route gate did not reject unrelated STARWELL APIs');
  const html=await fetch('http://127.0.0.1:'+TAILNET_GATE_PORT+'/wayglass/');
  if(!html.ok||(await html.text()).indexOf('<div id="app"')<0){
    throw Error('Tailnet route gate cannot reach the staged Wayglass frontend');
  }
  if (gatewayOnly) {
    process.stdout.write('[Wayglass] Restricted loopback gateway ready.\n');
  } else {
    process.stdout.write('[Wayglass] Tailnet-only gateway verified. Opening Tailscale Serve in foreground.\n');
    process.stdout.write('[Wayglass] Intended Nursery URL (verify from iPhone or iPad on the tailnet): '+origin+'/wayglass/?room=wayglass%3Acell-garden\n');
    process.stdout.write('[Wayglass] Keep this terminal running. Ctrl+C closes this Serve session.\n');
    child=spawn(process.env.WAYGLASS_TAILSCALE_CLI||'tailscale',['serve',String(TAILNET_GATE_PORT)],{stdio:'inherit',shell:false});
    const code=await new Promise((resolve,reject)=>{
      child.once('error',reject);
      child.once('exit',resolve);
    });
    if(!closing&&code!==0)process.exitCode=code||1;
  }
}catch(error){
  process.stderr.write('[Wayglass] '+error.message+'\n');
  process.exitCode=1;
}finally{
  if (!gatewayOnly || process.exitCode) await close();
}
