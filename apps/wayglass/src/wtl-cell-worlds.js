// Shared worlds the babies make together.
//
// When two named neighbours sing close enough to each other, they found a
// world. The world is itself a Wyrdrune program, written from what its two
// founders carry (their voices and their syllables), and it lives its own
// two-faced Möbius turns on the canonical runtime. Its colour, its sound, its
// texture under a touch and its size are its carry. The world names itself
// in its own choose phase from its founders' syllables (RFC-0002 pick).
//
// A person can touch a world. A touch reaches every cell living inside it and
// changes the world's next turn. A world that grows past its sky refuses the
// turn (verify rolls back). A world whose members are all gone and which has
// been quiet for three turns rests, and is remembered.
//
// Deterministic and bounded. No network, model, host capability or audio
// device here; the page decides whether to show, sound or vibrate it.
import {createWyrdruneRuntime} from './wtl-cell-runtime.js';
import {digestWce1Sync} from './wtl-cell-digest.js';

export const WORLD_SCHEMA='wayglass.wtl-cell-world/v0.1';
export const WORLD_CARRY=Object.freeze(['age','breadth','hue','members','pulse','quiet','texture','touches']);
export const TEXTURES=Object.freeze(['moss','glass','silk','ember','tide','feather']);
const runtime=createWyrdruneRuntime({hashSource:text=>digestWce1Sync({wtl_source:text}),continuityDigest:digestWce1Sync});
const fixed=n=>Number(Number(n).toFixed(4));
const compiled=new Map();
const lit=n=>fixed(n).toFixed(4);

export function foundingCarry(a,b){
  // The founders' voices set the world's first colour and note.
  const va=Math.abs(a.voice),vb=Math.abs(b.voice);
  return {age:0,breadth:0.9,hue:fixed(((va+vb)*1999)%360),members:2,
    pulse:fixed(110+((va*vb*100003)%440)),quiet:0,texture:Math.floor((va+vb)*977)%TEXTURES.length,touches:0};
}

function face(label,{founders,shift}){
  const participants=founders.map(f=>`{id: ${JSON.stringify(f.name)}, role: "founder", presence: true, agency: "free"}`).join(', ');
  return `mobius scoped {
  perceive {
    let felt = touches;
    let many = members;
  }
  compress {
    let calm = breadth * 0.92;
  }
  release {
    let grown = calm + many / (many + 4) * 0.25 + felt * 0.03;
    let warmed = drift(hue, ${shift} + felt * 7);
  }
  verify {
    require grown <= 3.5 else "a world keeps within its sky";
  }
  integrate {
    withness {participants: [${participants}], field: grown, agreement: "a world we share", commitment: "it holds only what its members bring"};
  }
  choose {
    let tone = when felt > 0 then (pulse * 1.5) % 660 + 110 else pulse;
    let tex = when felt > 2 then (texture + 1) % 6 else texture;
    let feel = pick(${JSON.stringify([...TEXTURES])}, tex);
    let lull = when felt > 0 or many > 0 then 0 else quiet + 1;
    let syllables = ${JSON.stringify(founders.flatMap(f=>f.syllables))};
    let name = [pick(syllables, ${lit(founders[0].voice)} * 104729), pick(syllables, ${lit(founders[1].voice)} * 104729 + 3)];
  }
  return {
    emit {face: "${label}", hue: warmed, pulse: tone, texture: feel, breadth: grown, name: name};
  }
  transcend {
    carry age = age + 1;
    carry breadth = grown;
    carry hue = warmed;
    carry members = many;
    carry pulse = tone;
    carry quiet = lull;
    carry texture = tex;
    carry touches = 0;
  }
}`;
}

/** The world's whole program, written from its founders. */
export function worldSource(founders){
  if(!Array.isArray(founders)||founders.length!==2)throw new TypeError('A world has two founders');
  const shift=lit(3+(Math.abs(founders[0].voice-founders[1].voice)*400)%17);
  return `// world of ${founders.map(f=>f.name).join(' & ')}
operator drift(h, d) = (h + d) % 360;
${face('outer',{founders,shift})}
${face('inner',{founders,shift})}`;
}

export async function turnWorld({founders,carry,touches=0,members=0,signal=null}){
  const source=worldSource(founders);
  let ir=compiled.get(source);
  if(!ir){ir=runtime.compile(source);compiled.set(source,ir);if(compiled.size>64)compiled.delete(compiled.keys().next().value);}
  const seeds={...carry,touches:Math.max(0,Math.min(40,Math.trunc(touches))),members:Math.max(0,Math.min(64,Math.trunc(members)))};
  const run=await runtime.execute(ir,{seeds,signal,maxOperations:4000});
  const committed=run.status==='committed';
  const next=committed?{...run.continuity.carry}:{...carry,touches:0,members:seeds.members};
  for(const key of ['breadth','hue','pulse'])next[key]=fixed(next[key]);
  const last=run.output.at(-1);
  return {carry:next,receipt:{schema:WORLD_SCHEMA,status:run.status,
    verdict:run.verdict?{phase:run.verdict.phase,reason:run.verdict.reason}:null,
    faces:run.checkpoints.map(c=>c.face),source_hash:ir.sourceHash,lineage_root:run.lineage.root,
    carry_digest:digestWce1Sync(next),
    texture:committed&&last?last.texture:TEXTURES[next.texture%TEXTURES.length],
    name_parts:committed&&last?[...last.name]:null,
    runtime:'lib/wyrdrune/runtime.mjs',host_effects:false,model_inference:false}};
}
