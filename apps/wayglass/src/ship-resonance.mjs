// Wayglass Ship Resonance v0.1
// A bounded, event-driven coordination instrument, NOT measured acoustic energy.
// No background polling, passive microphone access, autonomous model execution or
// cross-world state mutation. Each organ retains its identity and local authority.
export const SHIP_RESONANCE_SCHEMA='wayglass.ship-resonance/v0.1';
export const SHIP_ORGANS=Object.freeze([
 'wayglass:writing','wayglass:codex','wayglass:watercolour','wayglass:sound',
 'wayglass:observer','wayglass:magic','wayglass:worlds','wayglass:nursery',
 'wayglass:routes','wayglass:continuity','wayglass:system'
]);
const plain=v=>Number.isFinite(v);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function createShipResonance({organs=SHIP_ORGANS,capacity=128}={}){
 if(!Array.isArray(organs)||organs.length<2||organs.length>64||new Set(organs).size!==organs.length||organs.some(x=>typeof x!=='string'||!x||x.length>100))throw new TypeError('Distinct bounded organ identities required');
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>1024)throw new RangeError('Invalid history capacity');
 const fields=new Map(organs.map((id,i)=>[id,{id,phase:0,activity:0,frequency:0.1+(i%8)*0.03,revision:0,lastEvent:null}]));
 const subscribers=new Set(),journal=[];let stopped=false,serial=0;
 const snapshot=()=>{
  const members=[...fields.values()].map(x=>Object.freeze({...x}));
  const order=members.length?Math.hypot(members.reduce((s,x)=>s+Math.cos(x.phase),0),members.reduce((s,x)=>s+Math.sin(x.phase),0))/members.length:0;
  return Object.freeze({schema:SHIP_RESONANCE_SCHEMA,kind:'instrumented-event-projection',stopped,sequence:serial,order:Number(order.toFixed(6)),members:Object.freeze(members),events:Object.freeze(journal.map(x=>Object.freeze({...x}))),interpretation:'Derived UI/event mathematics; no measured physical resonance or inferred experience'});
 };
 const notify=()=>{const s=snapshot();for(const fn of subscribers){try{fn(s)}catch{/* listeners do not govern organ health */}}return s;};
 const observe=({organ,kind='event',strength=0.5,provenance='runtime-event'}={})=>{
  if(stopped)return snapshot();
  if(!fields.has(organ))throw new TypeError('Unknown Wayglass organ');
  if(typeof kind!=='string'||!kind||kind.length>90||typeof provenance!=='string'||!provenance||provenance.length>160||!plain(strength)||strength<0||strength>1)throw new TypeError('Invalid resonance event');
  const m=fields.get(organ);m.phase=Math.atan2(Math.sin(m.phase+(0.12+strength)*Math.PI),Math.cos(m.phase+(0.12+strength)*Math.PI));
  m.activity=clamp(m.activity*0.72+strength*0.28);m.revision++;m.lastEvent=kind;
  const evt={sequence:++serial,organ,kind,strength,provenance};
  journal.push(evt);if(journal.length>capacity)journal.shift();
  return notify();
 };
 return Object.freeze({snapshot,observe,subscribe(fn){if(typeof fn!=='function')throw new TypeError('Listener required');subscribers.add(fn);fn(snapshot());return()=>subscribers.delete(fn)},feather(){stopped=true;return notify()},resume({authorized=false}={}){if(authorized!==true)throw new Error('Explicit resume required');stopped=false;return notify()},clear({authorized=false}={}){if(authorized!==true)throw new Error('Explicit clear required');journal.length=0;serial=0;for(const m of fields.values()){m.phase=0;m.activity=0;m.revision=0;m.lastEvent=null}return notify()}});
}
export const shipResonance=createShipResonance();
