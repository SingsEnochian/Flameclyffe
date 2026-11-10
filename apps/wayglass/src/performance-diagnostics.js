// Local-only diagnostics. No prompts, identities, messages or credentials are recorded.
const MAX_SAMPLES=48;
const entries=new Map();
const clock=()=>globalThis.performance?.now?.() ?? Date.now();
function bounded(name){return String(name).slice(0,64);}
export function observeWayglassTiming(name,durationMs){
  if(!Number.isFinite(durationMs)||durationMs<0)return null;
  const key=bounded(name),array=entries.get(key)||[];
  array.push(Math.round(durationMs*10)/10);
  if(array.length>MAX_SAMPLES)array.shift();
  entries.set(key,array);
  return durationMs;
}
export function wayglassTimer(name){
  const started=clock();
  return ()=>observeWayglassTiming(name,Math.max(0,clock()-started));
}
export function wayglassPerformanceSnapshot(){
  const result={};
  for(const [key,samples] of entries){
    const sorted=[...samples].sort((a,b)=>a-b);
    result[key]=Object.freeze({
      samples:samples.length,
      latest_ms:samples.at(-1),
      average_ms:Math.round(samples.reduce((a,b)=>a+b,0)/samples.length*10)/10,
      p95_ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)],
      maximum_ms:sorted.at(-1),
    });
  }
  return Object.freeze(result);
}
export function clearWayglassPerformance(){entries.clear();}
