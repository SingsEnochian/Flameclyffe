'use strict';
// This is the permissioned transport for a Wyrdrune-composed spectral field.
// No harmonic, pitch, subsonic or ultrasonic calculation is implemented here.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { compile, execute } = require('./wyrdrune/wyrdrune.cjs');

const SCHEMA = 'wayglass.full-spectrum/v0.1';
const CODE = readFileSync(join(__dirname, 'wyrdrune', 'full-spectrum.wtl'), 'utf8');
const IR = compile(CODE);
const KINDS = Object.freeze(['gesture', 'writing', 'choice', 'route', 'world', 'return', 'feather', 'presence', 'observer', 'system']);
const KEYS = new Set(['kind','strength','motion','continuity','intent','affinity','phase','source_ref','event_id']);
const number = (value, name, min=0, max=1) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new TypeError(name + ' must be a finite number in ['+min+','+max+'].');
  return value;
};
function eventInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('An event object is required.');
  if (Object.keys(value).some(key=>!KEYS.has(key))) throw new TypeError('Unrecognised spectral event field; raw text is not accepted.');
  if (!KINDS.includes(value.kind)) throw new TypeError('Unknown spectral event kind.');
  if (typeof value.source_ref !== 'string' || !/^wayglass:[a-z0-9-]{1,72}$/.test(value.source_ref)) {
    throw new TypeError('A Wayglass-only provenance source is required.');
  }
  if (typeof value.event_id !== 'string' || !/^[a-z0-9._:-]{1,96}$/i.test(value.event_id)) {
    throw new TypeError('Bounded event identifier required.');
  }
  return Object.freeze({
    kind:value.kind,source_ref:value.source_ref,event_id:value.event_id,
    strength:number(value.strength,'strength'),motion:number(value.motion,'motion'),
    continuity:number(value.continuity,'continuity'),intent:number(value.intent,'intent'),
    affinity:number(value.affinity,'affinity'),phase:number(value.phase,'phase'),
  });
}
function frame(args) {
  if (args.length !== 9) throw new TypeError('Wyrdrune spectrum frame requires nine scalar inputs.');
  const [infrasonicHz, audibleOneHz, audibleTwoHz, ultrasonicHz, bloom, affinity, phase, foregroundGain, atmosphereGain] = args;
  number(infrasonicHz,'infrasonic Hz',0.01,19.99);
  number(audibleOneHz,'audible voice one',90,900);
  number(audibleTwoHz,'audible voice two',90,1200);
  number(ultrasonicHz,'ultrasonic representation Hz',20001,50000);
  number(bloom,'bloom');number(affinity,'affinity');number(phase,'phase');
  number(foregroundGain,'foreground gain',0,0.05);number(atmosphereGain,'atmosphere gain',0,0.04);
  return Object.freeze({
    infrasonic:Object.freeze({hz:infrasonicHz,unit:'Hz',kind:'virtual-envelope',physical_playback:false}),
    audible:Object.freeze({voice_one_hz:audibleOneHz,voice_two_hz:audibleTwoHz,foreground_gain:foregroundGain,atmosphere_gain:atmosphereGain,kind:'opt-in-sonification'}),
    ultrasonic:Object.freeze({hz:ultrasonicHz,unit:'Hz',kind:'virtual-detail-band',physical_playback:false}),
    bloom,affinity,phase,
  });
}
async function scoreSpectralEvent(value, principal) {
  if (!principal?.authorized) throw new Error('Spectral scoring requires authenticated owner permission.');
  const e=eventInput(value);
  const allowed=Object.freeze({id:'wayglass:authorized-spectral-session',authorized:true});
  const bridges={
    interaction:{
      strength:()=>e.strength,motion:()=>e.motion,continuity:()=>e.continuity,
      intent:()=>e.intent,phase:()=>e.phase,
    },
    participants:{affinity:()=>e.affinity},
    spectrum:{
      validate:({arguments:args})=>{
        if (args.length!==5) throw new TypeError('Wyrdrune spectrum validation requires five scalars.');
        frame([...args.slice(0,4),args[4],e.affinity,e.phase,0.01,0.005]);
        return 'validated';
      },
      frame:({arguments:args})=>frame(args),
    },
    continuity:{
      hold:({arguments:args})=>({kind:'uncommitted',pass:args[0]}),
      next:({arguments:args})=>({kind:'continuation',phase:args[0]}),
    },
  };
  const out=await execute(IR,{principal:allowed,bridges,maxOperations:600});
  if(out.withness.completedCycles!==2 || out.receipts.length!==16 || out.output.length!==8
    || out.output[0]!=='validated' || out.output[4]!=='validated') {
    throw new Error('Incomplete double Möbius spectral execution.');
  }
  return Object.freeze({
    event_id:e.event_id,kind:e.kind,source_ref:e.source_ref,
    spectrum:out.output[5],first_loop:out.output[1],
    phases:out.receipts.map(r=>r.phase),
    source_hash:out.sourceHash,withness:out.withness,
    acoustic_output:'none',model_invoked:false,
  });
}
async function scoreSpectralBatch(values,{principal}={}) {
  if (!principal?.authorized) throw new Error('Spectral scoring requires authenticated owner permission.');
  if (!Array.isArray(values) || values.length<1 || values.length>24) {
    throw new TypeError('Spectral batch must contain 1 through 24 interaction events.');
  }
  const valid=values.map(eventInput);
  if (new Set(valid.map(v=>v.event_id)).size !== valid.length) {
    throw new TypeError('Spectral batch event identifiers must be unique.');
  }
  // Independent WTL execution per interaction. No simulated voices or content.
  const events=[];
  for(const e of valid) events.push(await scoreSpectralEvent(e,principal));
  return Object.freeze({
    schema:SCHEMA,status:'composed-in-wyrdrune',count:events.length,
    events,programme_sha256:createHash('sha256').update(CODE).digest('hex'),
    emitted_infrasonic_audio:false,emitted_ultrasonic_audio:false,
    emitted_audible_audio:false,persisted:false,model_invoked:false,
    note:'Infrasonic and ultrasonic bands are virtual. They are not speaker emissions or environmental measurements.',
  });
}
module.exports={SCHEMA,CODE,IR,KINDS,eventInput,scoreSpectralEvent,scoreSpectralBatch};
