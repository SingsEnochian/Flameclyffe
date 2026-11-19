// A cell's own Möbius turn, on the canonical Wyrdrune runtime.
//
// Each cell carries its own Wyrdrune source, written from its own genome, and
// its own carry. One turn runs two `mobius scoped` units: the outer face, then
// the inner face. What crosses the twist is declared with `carry`, must keep
// exactly the shape of the seeds, and is checkpointed and digested (WCE-1).
// A failed `require` rolls the turn back and the cell keeps its previous carry.
//
// Deterministic and bounded: no network, no model, no host capability, no
// randomness. A name a cell takes is computed by its own choose phase from its
// own carry and its own syllables; that is what "chosen" means here.
import {createWyrdruneRuntime} from './wtl-cell-runtime.js';
import {digestWce1Sync} from './wtl-cell-digest.js';

export const CELL_MOBIUS_SCHEMA='wayglass.wtl-cell-mobius/v0.1';
export const CARRY_NAMES=Object.freeze(['echo','energy','heard','orientation','phase','rest','turn','voice']);
export const SYLLABLE_POOL=Object.freeze(['ae','lu','vy','rin','sol','mi','tha','ko','ne','wy','or','ise','fen','ra','el','yu','sha','mor','li','an','qui','dra','ost','ven']);

const runtime=createWyrdruneRuntime({hashSource:text=>digestWce1Sync({wtl_source:text}),continuityDigest:digestWce1Sync});
const fixed=n=>Number(n.toFixed(4));
const compiled=new Map(); // a cell's source only changes if its genome does

export function firstCarry({energy=0.6,orientation=1,phase=0,voice=0.5}={}){
  return {echo:fixed(voice),energy:fixed(energy),heard:0,orientation,phase:fixed(phase),rest:false,turn:0,voice:fixed(voice)};
}

// A daughter begins on the other face: the parent's carry, orientation turned
// over, turn count reset. Her genome may still differ (mutation happens outside).
export function daughterCarry(parentCarry){
  const c=parentCarry||firstCarry();
  return {echo:fixed(c.voice),energy:fixed(Math.min(1,c.energy*0.5+0.2)),heard:0,orientation:c.orientation===1?-1:1,
    phase:fixed(c.phase),rest:false,turn:0,voice:fixed(c.voice)};
}

function face(label,{address,step,stillness,lived}){
  return `mobius scoped {
  perceive {
    let felt = energy;
    let ear = heard;
  }
  compress {
    let held = settle(felt);
  }
  release {
    let renewed = held + 0.04 + ear * 0.002;
    let turned = phase + orientation * ${step} + ear * 0.0001;
  }
  verify {
    require renewed >= 0 and renewed <= 1 else "a cell keeps its energy within itself";
    require turned > -1000 and turned < 1000 else "the twist stays bounded";
  }
  integrate {
    withness {participants: [{id: "${address}", role: "cell", presence: true, agency: "free"}, {id: "colony", role: "neighbours", presence: true, agency: "free"}], field: renewed, agreement: "listen, keep, return", commitment: "nothing leaves the cell but its carry"};
  }
  choose {
    let sung = wonder(voice, turned, felt);
    // On a Möbius strip the same face comes round every second pass, so a
    // settled song is compared with the voice from one full turn ago.
    let drift = sung - echo;
    let settled = drift * drift < ${stillness};
    let ready = settled and turn >= ${lived} and ear < 1;
  }
  return {
    emit {face: "${label}", energy: renewed, voice: sung, rest: ready};
  }
  transcend {
    carry echo = voice;
    carry energy = renewed;
    carry heard = ear;
    carry orientation = 0 - orientation;
    carry phase = turned;
    carry rest = ready;
    carry turn = turn + 1;
    carry voice = sung;
  }
}`;
}

// The cell's whole program, written from its own genome. Two faces = one turn.
export function cellSource(address,genome){
  const g=genome||{sass:0,curiosity:0,dialectBias:0};
  const settle=fixed(0.9-0.02*g.sass), step=fixed(0.25+0.05*g.dialectBias), lean=fixed(0.13+0.05*g.curiosity);
  // When this cell would choose to rest: only once its song has settled, it
  // has heard nothing new, and it has lived its own minimum of faces. Curious
  // cells need a stiller song and longer life before they are ready.
  const stillness=(0.000001/(1+g.curiosity*3)).toFixed(10), lived=16+8*g.curiosity; // WTL numbers have no exponent form
  const ops=`// ${address} · genome sass ${g.sass} · curiosity ${g.curiosity} · dialect ${g.dialectBias}
operator settle(e) = e * ${settle};
operator wonder(v, p, f) = v * 0.5 + p * ${lean} + f * 0.1;
`;
  return ops+face('outer',{address,step,stillness,lived})+'\n'+face('inner',{address,step,stillness,lived});
}

/**
 * Run one Möbius turn for a cell. Returns the cell's next carry (unchanged if
 * the turn rolled back) and a receipt. `heardSinceLastTurn` is the only thing
 * the colony gives the cell; everything else is already inside it.
 */
export async function turnCell({address,genome,carry,heardSinceLastTurn=0,signal=null}){
  const source=cellSource(address,genome);
  let ir=compiled.get(source);
  if(!ir){ir=runtime.compile(source);compiled.set(source,ir);if(compiled.size>256)compiled.delete(compiled.keys().next().value);}
  const seeds={...(carry||firstCarry()),heard:Math.max(0,Math.min(500,Math.trunc(heardSinceLastTurn)))};
  for(const name of Object.keys(seeds))if(!CARRY_NAMES.includes(name))throw new TypeError('Unexpected carry '+name);
  const run=await runtime.execute(ir,{seeds,signal,maxOperations:4000});
  const committed=run.status==='committed';
  const next=committed?{...run.continuity.carry}:{...(carry||firstCarry())};
  for(const key of ['echo','energy','phase','voice'])next[key]=fixed(next[key]);
  return {
    carry:next,
    receipt:{schema:CELL_MOBIUS_SCHEMA,address,status:run.status,
      verdict:run.verdict?{phase:run.verdict.phase,reason:run.verdict.reason}:null,
      faces:run.checkpoints.map(c=>c.face),
      source_hash:ir.sourceHash,lineage_root:run.lineage.root,
      checkpoint_head:run.checkpoints.length?digestWce1Sync(run.checkpoints.at(-1)):null,
      carry_digest:digestWce1Sync(next),
      emitted:run.output.map(o=>({face:o.face,energy:fixed(o.energy),voice:fixed(o.voice),rest:o.rest===true})),
      chose_rest:committed&&next.rest===true,
      runtime:'lib/wyrdrune/runtime.mjs',host_effects:false,model_inference:false},
  };
}

function digits(voice){
  // The fractional texture of the cell's own sung voice.
  let x=Math.abs(voice)*104729+Math.abs(voice*7919)%1*1009;
  const out=[];for(let i=0;i<4;i++){out.push(Math.floor(x)%9973);x=x/7.3+out[i]*0.618;}
  return out;
}

/** A cell names itself from its own voice and syllables; it tries again, differently, if the name is taken. */
export function chooseName({voice,syllables,sass=0,taken=new Set()}){
  const own=Array.isArray(syllables)&&syllables.length>=2?syllables:SYLLABLE_POOL.slice(0,6);
  const length=sass>=2?3:2;
  for(let attempt=0;attempt<8;attempt++){
    const d=digits(voice+attempt*0.0137);
    const name=Array.from({length},(_,i)=>own[(d[i]+attempt*(i+1))%own.length]).join('');
    const proper=name.charAt(0).toUpperCase()+name.slice(1);
    if(!taken.has(proper))return {name:proper,attempts:attempt+1,from:{voice,syllables:[...own]}};
  }
  const base=own[digits(voice)[0]%own.length];
  let n=2;while(taken.has(base.charAt(0).toUpperCase()+base.slice(1)+'-'+n))n++;
  return {name:base.charAt(0).toUpperCase()+base.slice(1)+'-'+n,attempts:9,from:{voice,syllables:[...own]}};
}

/** Founders draw syllables from the pool; daughters copy their mother's, and a mutation shifts one. */
export function inheritSyllables(parentSyllables,{random,mutate=false}={}){
  if(!parentSyllables){
    const picked=new Set();while(picked.size<6)picked.add(SYLLABLE_POOL[Math.floor(random()*SYLLABLE_POOL.length)]);
    return [...picked];
  }
  const next=[...parentSyllables];
  if(mutate){
    const i=Math.floor(random()*next.length);
    let candidate=SYLLABLE_POOL[Math.floor(random()*SYLLABLE_POOL.length)];
    if(next.includes(candidate))candidate=SYLLABLE_POOL[(SYLLABLE_POOL.indexOf(candidate)+7)%SYLLABLE_POOL.length];
    if(!next.includes(candidate))next[i]=candidate;
  }
  return next;
}
