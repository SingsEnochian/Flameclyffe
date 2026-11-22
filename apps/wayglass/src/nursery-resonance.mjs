// Nursery Resonance Field v0.1: a bounded, deterministic mathematical experiment.
// Every cell retains its own identity and natural frequency. No real Nursery
// telemetry, physical energy transfer, audio or host/device action is implied.
export const RESONANCE_SCHEMA='wayglass.nursery-resonance/v0.1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bound=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const round=n=>Math.round(n*1e9)/1e9;
export function createResonanceField({cells,links=[],coupling=0.35,stepSeconds=0.04}={}){
  if(!Array.isArray(cells)||cells.length<2||cells.length>24)throw new TypeError('2–24 named resonance cells required');
  if(!finite(coupling)||coupling<0||coupling>1||!finite(stepSeconds)||stepSeconds<=0||stepSeconds>0.1)throw new RangeError('Resonance parameters outside safe bounds');
  const identities=new Set();
  const members=cells.map(cell=>{
    if(typeof cell?.id!=='string'||! /^[a-zA-Z0-9:_-]{1,60}$/.test(cell.id)||identities.has(cell.id))throw new TypeError('Unique stable cell identities required');
    identities.add(cell.id);
    if(!finite(cell.hz)||cell.hz<0.05||cell.hz>5||!finite(cell.phase)||Math.abs(cell.phase)>Math.PI*2)
      throw new RangeError('Finite frequency (0.05–5 Hz) and phase (±2π) required');
    return Object.freeze({id:cell.id,hz:cell.hz,phase:cell.phase});
  });
  if(!Array.isArray(links)||links.length>144)throw new RangeError('Too many links');
  const neighbours=new Map(members.map(cell=>[cell.id,[]]));
  const edges=new Set();
  for(const link of links){
    const a=String(link?.from??''),b=String(link?.to??''),strength=link?.strength??1;
    if(!identities.has(a)||!identities.has(b)||a===b||!finite(strength)||strength<0||strength>1)throw new TypeError('Invalid scoped resonance link');
    const key=[a,b].sort().join('|');if(edges.has(key))throw new TypeError('Duplicate resonance link');
    edges.add(key);neighbours.get(a).push({id:b,strength});neighbours.get(b).push({id:a,strength});
  }
  const initial=members.map(x=>x.phase);
  let phase=initial.slice(),cycles=0;
  const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
  const snapshot=()=>{
    const re=phase.reduce((n,x)=>n+Math.cos(x),0)/phase.length;
    const im=phase.reduce((n,x)=>n+Math.sin(x),0)/phase.length;
    return Object.freeze({schema:RESONANCE_SCHEMA,source:'declared-simulation',cycles,elapsedSeconds:round(cycles*stepSeconds),coupling,
      order:round(Math.hypot(re,im)),members:members.map((m,i)=>Object.freeze({id:m.id,naturalHz:m.hz,phase:round(phase[i]),originPhase:round(initial[i])})),
      links:[...edges].sort(),interpretation:'simulation-only: no nursery, sensor, or physical measurement'});
  };
  const step=(count=1)=>{
    if(!Number.isSafeInteger(count)||count<1||count>2000||cycles+count>20000)throw new RangeError('Bounded steps required');
    for(let t=0;t<count;t++){
      const previous=phase.slice();
      phase=members.map((m,i)=>{
        const targets=neighbours.get(m.id),influence=targets.reduce((sum,edge)=>{
          const j=members.findIndex(x=>x.id===edge.id);
          return sum+edge.strength*Math.sin(previous[j]-previous[i]);
        },0);
        const normalizer=Math.max(1,targets.reduce((sum,e)=>sum+e.strength,0));
        const velocity=2*Math.PI*m.hz+coupling*influence/normalizer;
        return wrap(previous[i]+stepSeconds*velocity);
      });cycles++;
    }return snapshot();
  };
  return Object.freeze({snapshot,step,reset(){phase=initial.slice();cycles=0;return snapshot();}});
}
