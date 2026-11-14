// Owner-scoped, cross-deck audiovisual encounter coordination.
// No microphones, cameras, models, or synthetic presence are started by this module.
const DECKS=Object.freeze(['watercolour','codex','mythience','toybox','observer','voice','video','return']);
const MEDIA=new Set(['audio','video','sound','text','gesture','haptic']);
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
const MAX_EVENTS=256;
function identifier(value,label){if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' invalid');return value;}
function copy(value){return JSON.parse(JSON.stringify(value));}
export function createInterpersonalMediaContinuity({owner_id,authorise,clock=()=>Date.now()}={}){
 identifier(owner_id,'owner_id');
 if(typeof authorise!=='function')throw new TypeError('authorise required');
 if(typeof clock!=='function')throw new TypeError('clock required');
 const encounters=new Map();let feathered=false;
 async function permitted(action,encounter_id){
  if(feathered)throw new Error('Feather: all media stopped');
  if(await authorise({owner_id,encounter_id,action})!==true)throw new Error('Consent denied or revoked');
  if(feathered)throw new Error('Feather: all media stopped');
 }
 async function begin({encounter_id,participants,decks=DECKS}){
  identifier(encounter_id,'encounter_id');await permitted('begin',encounter_id);
  if(encounters.has(encounter_id))throw new Error('Encounter already exists');
  if(!Array.isArray(participants)||participants.length<2||participants.length>16)throw new TypeError('Two or more participants required');
  const ids=participants.map(p=>identifier(p.id,'participant id'));
  if(new Set(ids).size!==ids.length)throw new Error('Distinct participant identities required');
  if(participants.some(p=>p.opt_in!==true))throw new Error('Every participant must opt in');
  if(!Array.isArray(decks)||!decks.length||decks.some(d=>!DECKS.includes(d))||new Set(decks).size!==decks.length)throw new Error('Invalid decks');
  const state={encounter_id,participants:ids,decks:[...decks],events:[],stopped:false,sequence:0};
  await permitted('begin',encounter_id);
  if(encounters.has(encounter_id))throw new Error('Encounter already exists');
  encounters.set(encounter_id,state);
  return Object.freeze({encounter_id,participants:[...ids],decks:[...decks],status:'local-proposal'});
 }
 async function emit({encounter_id,participant_id,deck,kind,ref,at_ms,consent_token}){
  identifier(encounter_id,'encounter_id');identifier(participant_id,'participant_id');
  const state=encounters.get(encounter_id);
  if(!state||state.stopped)throw new Error('Encounter unavailable');
  if(!state.participants.includes(participant_id))throw new Error('Unknown participant');
  if(!state.decks.includes(deck)||!MEDIA.has(kind))throw new Error('Unsupported deck or modality');
  if(typeof ref!=='string'||!/^sha256:[a-f0-9]{64}$/i.test(ref))throw new Error('Content-addressed reference required');
  if(!Number.isSafeInteger(at_ms)||at_ms<0)throw new Error('Invalid monotonic timestamp');
  if(typeof consent_token!=='string'||!ID.test(consent_token))throw new Error('Explicit scoped consent reference required');
  await permitted('emit',encounter_id);
  if(state.stopped)throw new Error('Encounter stopped');
  if(state.events.length>=MAX_EVENTS)throw new Error('Encounter event limit reached');
  const event=Object.freeze({schema:'wayglass.interpersonal-media/v1',encounter_id,participant_id,deck,kind,ref:ref.toLowerCase(),at_ms,consent_token,sequence:++state.sequence,disposition:'proposal-not-persisted'});
  state.events.push(event);
  return event;
 }
 async function project({encounter_id,deck}){
  identifier(encounter_id,'encounter_id');await permitted('read',encounter_id);
  const state=encounters.get(encounter_id);
  if(!state||state.stopped||!state.decks.includes(deck))throw new Error('Deck unavailable');
  const result=copy(state.events.filter(e=>e.deck===deck||deck==='observer'||deck==='return'));
  await permitted('read',encounter_id);
  if(state.stopped)throw new Error('Encounter stopped');
  return Object.freeze({encounter_id,deck,events:Object.freeze(result.map(Object.freeze)),status:'local-proposal'});
 }
 function stop(encounter_id){
  if(encounter_id===undefined){feathered=true;for(const state of encounters.values())state.stopped=true;return;}
  const state=encounters.get(identifier(encounter_id,'encounter_id'));
  if(state)state.stopped=true;
 }
 return Object.freeze({begin,emit,project,feather:()=>stop(),stop,decks:DECKS});
}
