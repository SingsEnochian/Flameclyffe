#!/usr/bin/env node
// Tailnet-private first voyage: a foreground Tailscale Serve session to the
// route-limited Wayglass gate. No Funnel, no direct port 3000 exposure.
import {spawn} from 'node:child_process';
import {createTailnetGate,TAILNET_GATE_PORT} from './wayglass-tailnet-gate.mjs';

const origin=String(process.env.WAYGLASS_TAILNET_ORIGIN||'');
let url;
try { url=new URL(origin); }
catch { throw Error('Verified WAYGLASS_TAILNET_ORIGIN is required'); }
if(url.protocol!=='https:'||!url.hostname.endsWith('.ts.net')||
   url.pathname!=='/'||url.port||url.username||url.password||url.search||url.hash){
  throw Error('Invalid verified Tailscale HTTPS origin');
}
const gate=createTailnetGate();
let child,closing=false;
async function close(){
  if(closing)return;
  closing=true;
  if(child&&!child.killed)child.kill();
  await gate.close().catch(()=>{});
}
process.once('SIGINT',()=>{void close().then(()=>{process.exitCode=0;});});
process.once('SIGTERM',()=>{void close().then(()=>{process.exitCode=0;});});
try{
  await gate.listen();
  // A remote browser cannot reach STARWELL's unrelated endpoints through this
  // gateway. Verify the path boundary before opening a tailnet route.
  const blocked=await fetch('http://127.0.0.1:'+TAILNET_GATE_PORT+'/api/boxfire/status');
  if(blocked.status!==404)throw Error('Tailnet route gate did not reject unrelated STARWELL APIs');
  const html=await fetch('http://127.0.0.1:'+TAILNET_GATE_PORT+'/wayglass/');
  if(!html.ok||(await html.text()).indexOf('<div id="app"')<0){
    throw Error('Tailnet route gate cannot reach the staged Wayglass frontend');
  }
  process.stdout.write('[Wayglass] Tailnet-only gateway verified. Opening Tailscale Serve in foreground.\n');
  process.stdout.write('[Wayglass] Intended URL (confirm from Tailscale output): '+origin+'/wayglass/\n');
  process.stdout.write('[Wayglass] Keep this terminal running. Ctrl+C closes this Serve session.\n');
  child=spawn('tailscale',['serve',String(TAILNET_GATE_PORT)],{stdio:'inherit',shell:false});
  const code=await new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('exit',resolve);
  });
  if(!closing&&code!==0)process.exitCode=code||1;
}catch(error){
  process.stderr.write('[Wayglass] '+error.message+'\n');
  process.exitCode=1;
}finally{
  await close();
}
