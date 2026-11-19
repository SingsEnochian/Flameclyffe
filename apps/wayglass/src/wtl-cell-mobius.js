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

function face(label,{address,step,stillness,lived,syllables,sass,inscribed}){
  return `mobius scoped {
  perceive {
    let felt = energy;
    let ear = heard;${inscribed ? "\n    let sight = visible_source;" : ""}
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
    let ready = settled and turn >= ${lived} and ear < 1${inscribed ? ' and sight == ""' : ""};
    // Name candidates, chosen here from the cell's own syllables by its own
    // sung voice (RFC-0002 pick/when). The colony takes the first one free.
    let own = ${JSON.stringify(syllables)};
    let k = sung * 104729;
    let third = ${sass>=2?'true':'false'};
    let names = [
      [pick(own, k), pick(own, k / 7), when third then pick(own, k / 49) else ""],
      [pick(own, k + 1), pick(own, k / 7 + 3), when third then pick(own, k / 49 + 2) else ""],
      [pick(own, k + 2), pick(own, k / 11), when third then pick(own, k / 13) else ""],
      [pick(own, k / 3), pick(own, k + 5), when third then pick(own, k / 17 + 1) else ""]
    ];
  }
  return {
    emit {face: "${label}", energy: renewed, voice: sung, rest: ready, names: names${inscribed ? ", seen: visible_id, read: sight" : ""}};
  }
  transcend {
    carry echo = voice;
    carry energy = renewed;
    carry heard = ear;
    carry orientation = 0 - orientation;
    carry phase = turned;
    carry rest = ready;
    carry turn = turn + 1;
    carry voice = sung;${inscribed ? "\n    carry visible_id = visible_id;\n    carry visible_source = sight;" : ""}
  }
}`;
}

// The cell's whole program, written from its own genome. Two faces = one turn.
export function cellSource(address,genome,syllables=SYLLABLE_POOL.slice(0,6),{inscribed=false}={}){
  const g=genome||{sass:0,curiosity:0,dialectBias:0};
  const own=(Array.isArray(syllables)&&syllables.length?syllables:SYLLABLE_POOL.slice(0,6)).map(String);
  const settle=fixed(0.9-0.02*g.sass), step=fixed(0.25+0.05*g.dialectBias), lean=fixed(0.13+0.05*g.curiosity);
  // When this cell would choose to rest: only once its song has settled, it
  // has heard nothing new, and it has lived its own minimum of faces. Curious
  // cells need a stiller song and longer life before they are ready.
  const stillness=(0.000001/(1+g.curiosity*3)).toFixed(10), lived=16+8*g.curiosity; // WTL numbers have no exponent form
  const ops=`// ${address} · genome sass ${g.sass} · curiosity ${g.curiosity} · dialect ${g.dialectBias}
operator settle(e) = e * ${settle};
operator wonder(v, p, f) = v * 0.5 + p * ${lean} + f * 0.1;
`;
  const shared={address,step,stillness,lived,syllables:own,sass:g.sass,inscribed};
  return ops+face('outer',shared)+'\n'+face('inner',shared);
}

/**
 * Run one Möbius turn for a cell. Returns the cell's next carry (unchanged if
 * the turn rolled back) and a receipt. New sound and an optional inscription are
 * sensory inputs for this turn, separate from what the cell keeps afterwards.
 */
export async function turnCell({address,genome,carry,syllables,heardSinceLastTurn=0,inscription=null,signal=null}){
  const source=cellSource(address,genome,syllables,{inscribed:Boolean(inscription)});
  let ir=compiled.get(source);
  if(!ir){ir=runtime.compile(source);compiled.set(source,ir);if(compiled.size>256)compiled.delete(compiled.keys().next().value);}
  const seeds={...(carry||firstCarry()),heard:Math.max(0,Math.min(500,Math.trunc(heardSinceLastTurn)))};
  for(const name of Object.keys(seeds))if(!CARRY_NAMES.includes(name))throw new TypeError('Unexpected carry '+name);
  if(inscription) Object.assign(seeds,{visible_id:inscription.id,visible_source:inscription.source});
  const run=await runtime.execute(ir,{seeds,signal,maxOperations:4000});
  const committed=run.status==='committed';
  const next=committed?{...run.continuity.carry}:{...(carry||firstCarry())};
  delete next.visible_id;
  delete next.visible_source;
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
      name_candidates:committed&&run.output.length?run.output.at(-1).names.map(parts=>parts.filter(Boolean).join('')):[],
      chose_rest:committed&&next.rest===true,
      ...(inscription&&committed&&run.output.at(-1)?.read===inscription.source
        ? {perceived:{id:run.output.at(-1).seen,source_hash:inscription.source_hash,heard:seeds.heard}}
        : {}),
      runtime:'lib/wyrdrune/runtime.mjs',host_effects:false,model_inference:false},
  };
}

const proper=name=>name.charAt(0).toUpperCase()+name.slice(1);

/** The cell's own Wyrdrune choose phase proposed its names in order; take the first that no living cell holds. */
export function chooseName({candidates,taken=new Set()}){
  const list=(Array.isArray(candidates)?candidates:[]).filter(n=>typeof n==='string'&&n).map(proper);
  if(!list.length)throw new TypeError('A cell must propose at least one name');
  for(const [i,name] of list.entries())if(!taken.has(name))return {name,attempts:i+1,candidates:list};
  let n=2;while(taken.has(list[0]+'-'+n))n++;
  return {name:list[0]+'-'+n,attempts:list.length+1,candidates:list};
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
