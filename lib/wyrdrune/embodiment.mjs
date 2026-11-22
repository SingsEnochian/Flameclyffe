// Wyrdrune Universal Embodiment · EMBODIMENT-001/v0.1
// Portable participant identity and world-capability translation, not teleportation.
// Deterministic, pure data. No model agency, physical actuation, or world entry.
export const EMBODIMENT_SCHEMA='wyrdrune.embodiment/v0.1';
export const WORLD_PROFILE_SCHEMA='wyrdrune.universe-profile/v0.1';
export const EMBODIMENT_PROPOSAL_SCHEMA='wyrdrune.embodiment-proposal/v0.1';
const ID=/^[a-zA-Z][a-zA-Z0-9:_-]{0,79}$/;
const CLASSES=new Set(['visual','motion','voice','gesture','spatial-audio','haptics','flight','magic','robotic-movement']);
const MAX=16;
const clone=value=>JSON.parse(JSON.stringify(value));
const label=(v,name)=>{if(typeof v!=='string'||v.length<1||v.length>120)throw new TypeError('Invalid '+name);return v;};
const id=(v,name)=>{if(typeof v!=='string'||!ID.test(v))throw new TypeError('Invalid '+name);return v;};
const unique=xs=>new Set(xs).size===xs.length;
const caps=(value,name)=>{
 if(!Array.isArray(value)||value.length>MAX||value.some(x=>!CLASSES.has(x))||!unique(value))throw new TypeError('Invalid '+name+' capabilities');
 return [...value];
};
export function embodimentIdentity(participantId,displayName,capabilities){
 return Object.freeze({schema:EMBODIMENT_SCHEMA,participantId:id(participantId,'participant'),displayName:label(displayName,'participant label'),
  desiredCapabilities:caps(capabilities,'desired'),identityAuthority:'participant-declared',activeForm:null,
  // Stable identity is not a claim of independent presence or verified model authorship.
  continuity:'distinct-attributed-identity'});
}
export function universeProfile(worldId,displayName,capabilities,medium){
 id(worldId,'world');label(displayName,'world label');
 if(!['digital','physical-proposal'].includes(medium))throw new TypeError('Invalid universe medium');
 const supported=caps(capabilities,'world');
 if(medium==='physical-proposal'&&supported.includes('magic'))throw new TypeError('Physical profiles cannot claim magic capabilities');
 return Object.freeze({schema:WORLD_PROFILE_SCHEMA,worldId,displayName,supported,medium,
   authority:medium==='physical-proposal'?'design-only-no-device-access':'declared-sandbox-profile',
   liveVerified:false});
}
function checkIdentity(identity){
 if(identity?.schema!==EMBODIMENT_SCHEMA||!ID.test(identity.participantId))throw new TypeError('Embodiment identity required');
 return identity;
}
function checkWorld(world){
 if(world?.schema!==WORLD_PROFILE_SCHEMA||!ID.test(world.worldId))throw new TypeError('World capability profile required');
 return world;
}
export function proposeEmbodiment(identity,world,formId,requested){
 checkIdentity(identity);checkWorld(world);id(formId,'form');
 const wanted=caps(requested,'requested'),granted=wanted.filter(x=>world.supported.includes(x)),unavailable=wanted.filter(x=>!world.supported.includes(x));
 return Object.freeze({schema:EMBODIMENT_PROPOSAL_SCHEMA,participantId:identity.participantId,worldId:world.worldId,formId,
  medium:world.medium,requested:wanted,compatible:granted,unavailable,disposition:'almost-open',adopted:false,
  requiresExplicitConsent:true,canExecutePhysicalActions:false,worldAuthority:world.authority});
}
// An adopted digital form is an explicit local choice. This function changes only
// an immutable record; it NEVER sends movement, device or model commands.
export function adoptEmbodiment(identity,proposal,{confirmed=false}={}){
 checkIdentity(identity);
 if(proposal?.schema!==EMBODIMENT_PROPOSAL_SCHEMA||proposal.participantId!==identity.participantId)throw new TypeError('Proposal identity mismatch');
 if(confirmed!==true)throw new Error('Explicit embodiment confirmation required');
 if(proposal.medium!=='digital')throw new Error('Physical embodiment requires separately verified hardware controls');
 if(proposal.unavailable.length)throw new Error('Untranslated capabilities remain in Almost; adjust the requested form');
 return Object.freeze({...clone(identity),activeForm:Object.freeze({worldId:proposal.worldId,formId:proposal.formId,
  compatible:[...proposal.compatible],medium:proposal.medium}),continuity:'distinct-attributed-identity'});
}
export function returnEmbodiment(identity,{confirmed=false}={}){
 checkIdentity(identity);if(confirmed!==true)throw new Error('Explicit Return required');
 return Object.freeze({identity:Object.freeze({...clone(identity),activeForm:null}),receipt:Object.freeze({
  schema:'wyrdrune.embodiment-return/v0.1',participantId:identity.participantId,
  departed:identity.activeForm?clone(identity.activeForm):null,preserved:'participant-identity',status:'returned',
  authority:'local-digital-transition-only'})});
}
export const EMBODIMENT_FUNCTIONS=Object.freeze(['embodimentIdentity','universeProfile','proposeEmbodiment']);
export function evaluateEmbodiment(name,args){
 const fn={embodimentIdentity,universeProfile,proposeEmbodiment}[name];
 if(!fn)return {handled:false};
 const arity={embodimentIdentity:3,universeProfile:4,proposeEmbodiment:4};
 if(args.length!==arity[name])throw new TypeError(name+' expects '+arity[name]+' arguments');
 return {handled:true,value:fn(...args)};
}
