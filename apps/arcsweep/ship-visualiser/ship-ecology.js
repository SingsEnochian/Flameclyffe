/**
 * One Wayglass ship, one shared ecology model, projected through every instrument.
 * Molequle's local, historically conditioned simulation inspired the architectural
 * research, but no upstream source or code is imported.
 *
 * Simulation tissue is not ship intelligence, crew identity, navigational authority,
 * consciousness evidence, or canonical Return Engine memory.
 */
import { acceptSensorySignal } from '../ship-ui/ship-sensory-spine.js';

export const SHIP_ECOLOGY_SCHEMA='wayglass.ship.visual-ecology/v0.1';
export const CELL_COLUMNS=12;
export const CELL_ROWS=8;
export const MAX_ENTITIES=28;
const CELLS=CELL_COLUMNS*CELL_ROWS;
const clamp=(v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const validNum=v=>typeof v==='number'&&Number.isFinite(v);
const finite=(x,lo,hi)=>validNum(x)&&x>=lo&&x<=hi;
const WORLD_SLUG=/^[a-z0-9][a-z0-9-]{0,63}$/;

function nextRng(state) {
  let x=state>>>0;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return x>>>0||1;
}
function cellAt(x,y){
  const col=Math.min(CELL_COLUMNS-1,Math.floor(clamp(x)*CELL_COLUMNS));
  const row=Math.min(CELL_ROWS-1,Math.floor(clamp(y)*CELL_ROWS));
  return row*CELL_COLUMNS+col;
}
function makeEntity(id,next){
  const x=next(),y=next();
  return {id,x,y,vx:(next()-.5)*.006,vy:(next()-.5)*.006,
    affinity:.2+next()*.65,inertia:.3+next()*.65,hue:next(),history:0};
}
function exactKeys(obj,keys) {return keys.every(k=>Object.hasOwn(obj,k));}
const ENTITY_KEYS=['id','x','y','vx','vy','affinity','inertia','hue','history'];
function validateSnapshot(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new TypeError('Invalid ecology snapshot');
  if(snapshot.schema!==SHIP_ECOLOGY_SCHEMA||snapshot.status!=='local_simulation')throw new TypeError('Unknown ecology snapshot');
  if(!Number.isInteger(snapshot.seed)||snapshot.seed<1||snapshot.seed>0xffffffff)throw new TypeError('Invalid ecology seed');
  if(!Number.isInteger(snapshot.rng)||snapshot.rng<1||snapshot.rng>0xffffffff)throw new TypeError('Invalid ecology rng');
  if(!Number.isInteger(snapshot.tick)||snapshot.tick<0||snapshot.tick>10_000_000)throw new TypeError('Invalid ecology tick');
  if(!Array.isArray(snapshot.field)||snapshot.field.length!==CELLS||!snapshot.field.every(v=>finite(v,0,1)))throw new TypeError('Invalid ecology history');
  if(!Array.isArray(snapshot.entities)||snapshot.entities.length!==MAX_ENTITIES)throw new TypeError('Invalid ecology population');
  const seen=new Set();
  for(const e of snapshot.entities){
    if(!e||typeof e!=='object'||!exactKeys(e,ENTITY_KEYS)||!Number.isInteger(e.id)||e.id<0||e.id>=MAX_ENTITIES||seen.has(e.id))throw new TypeError('Invalid ecology entity');
    seen.add(e.id);
    for(const key of ['x','y','affinity','inertia','hue','history'])if(!finite(e[key],0,1))throw new TypeError('Invalid ecology component '+key);
    for(const key of ['vx','vy'])if(!finite(e[key],-.05,.05))throw new TypeError('Invalid ecology velocity');
  }
  if(!Array.isArray(snapshot.bonds)||snapshot.bonds.length>112)throw new TypeError('Invalid ecology bonds');
  const pairs=new Set();
  for(const pair of snapshot.bonds){
    if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||!Number.isInteger(pair[1])||pair[0]<0||pair[1]>=MAX_ENTITIES||pair[0]>=pair[1])throw new TypeError('Invalid ecology bond');
    const key=pair.join(':');if(pairs.has(key))throw new TypeError('Duplicate ecology bond');pairs.add(key);
  }
  if(!Array.isArray(snapshot.seen)||snapshot.seen.length>64||!snapshot.seen.every(v=>typeof v==='string'&&v.length>=16&&v.length<=96)||new Set(snapshot.seen).size!==snapshot.seen.length)throw new TypeError('Invalid ecology event history');
  if(!finite(snapshot.excitation,0,1))throw new TypeError('Invalid ecology excitation');
  if(!WORLD_SLUG.test(snapshot.world_id))throw new TypeError('Invalid ecology world');
  return snapshot;
}
export class LivingShipEcology {
  constructor({seed=137,worldId='terra-aeterna',snapshot=null}={}){
    if(snapshot){
      const incoming=validateSnapshot(snapshot);
      this.seed=incoming.seed;
      this.rng=incoming.rng;
      this.tick=incoming.tick;
      this.field=[...incoming.field];
      this.entities=incoming.entities.map(e=>({...e}));
      this.bonds=incoming.bonds.map(pair=>[...pair]);
      this.excitation=incoming.excitation;
      this.seen=[...incoming.seen];
      this.worldId=incoming.world_id;
    }else{
      if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw new TypeError('Seed must be a positive uint32');
      if(typeof worldId!=='string'||!WORLD_SLUG.test(worldId))throw new TypeError('Invalid world');
      this.seed=seed;this.rng=seed;this.tick=0;this.field=Array(CELLS).fill(0);
      const next=()=>{this.rng=nextRng(this.rng);return this.rng/4294967296;};
      this.entities=Array.from({length:MAX_ENTITIES},(_,i)=>makeEntity(i,next));
      this.bonds=[];this.excitation=0;this.seen=[];this.worldId=worldId;
    }
  }
  observe(signal,{now=Date.now()}={}){
    const s=acceptSensorySignal(signal,{now});
    if(!s||this.seen.includes(s.event_id))return false;
    this.seen.push(s.event_id);
    if(this.seen.length>64)this.seen.shift();
    this.worldId=s.world_id;
    if(s.kind==='feather'){this.excitation=0;return true;}
    if(s.kind==='note-off'){this.excitation*=.78;return true;}
    const octave=Math.log2(s.frequency_hz/220);
    const a=octave*2.399963229728653;
    const x=clamp(.5+Math.sin(a)*.32),y=clamp(.5+Math.cos(a)*.32);
    const key=cellAt(x,y);
    const gain=.15+.5*s.velocity/127;
    this.field[key]=clamp(this.field[key]+gain);
    this.excitation=clamp(this.excitation+gain*.42);
    return true;
  }
  step(count=1){
    if(!Number.isInteger(count)||count<1||count>240)throw new RangeError('Invalid step count');
    for(let i=0;i<count;i++){
      this.tick++;
      this.excitation*=.982;
      for(let j=0;j<CELLS;j++)this.field[j]*=.999;
      const next=()=>{this.rng=nextRng(this.rng);return this.rng/4294967296;};
      for(const e of this.entities){
        const local=this.field[cellAt(e.x,e.y)];
        const drift=(next()-.5)*.002;
        e.vx=clamp(e.vx*.96+(local-.25)*.00036+drift*(1-e.inertia),-.018,.018);
        e.vy=clamp(e.vy*.96+(this.excitation-.2)*.00012+(next()-.5)*.0014*(1-e.inertia),-.018,.018);
        e.x=clamp(e.x+e.vx,.018,.982);
        e.y=clamp(e.y+e.vy,.018,.982);
        e.history=clamp(e.history*.995+local*.004);
        this.field[cellAt(e.x,e.y)]=clamp(this.field[cellAt(e.x,e.y)]+e.history*.0005);
      }
      const existing=new Set(this.bonds.map(pair=>pair.join(':')));
      const updated=[];
      for(let a=0;a<this.entities.length;a++){
        for(let b=a+1;b<this.entities.length;b++){
          const left=this.entities[a],right=this.entities[b];
          const dx=left.x-right.x,dy=left.y-right.y;
          const dist2=dx*dx+dy*dy;
          const key=a+':'+b,connected=existing.has(key);
          const affinity=(left.affinity+right.affinity)*.5;
          // Context creates a path-dependent propensity for (re)connection.
          const ground=this.field[cellAt((left.x+right.x)*.5,(left.y+right.y)*.5)];
          const threshold=.004+affinity*.006+ground*.009;
          if((connected&&dist2<threshold*2.1)||(!connected&&dist2<threshold)){
            updated.push([a,b]);
            if(!connected){
              left.history=clamp(left.history+.015);right.history=clamp(right.history+.015);
              const slot=cellAt((left.x+right.x)*.5,(left.y+right.y)*.5);
              this.field[slot]=clamp(this.field[slot]+.04);
            }
          }
        }
      }
      this.bonds=updated.slice(0,112);
    }
    return this.snapshot();
  }
  snapshot(){
    return {
      schema:SHIP_ECOLOGY_SCHEMA,status:'local_simulation',
      source:'Wayglass living-glass simulation, not authenticated ship runtime',
      seed:this.seed,rng:this.rng,tick:this.tick,world_id:this.worldId,
      field:[...this.field],entities:this.entities.map(e=>({...e})),
      bonds:this.bonds.map(pair=>[...pair]),excitation:this.excitation,seen:[...this.seen],
      canonical_receipt:false,identity_attested:false,flight_authority:false,
    };
  }
  static restore(data){return new LivingShipEcology({snapshot:data});}
}
