// Internal Wayglass nervous-system resonance vocabulary, not a room or tool.\n// The historical filename is retained for compatibility with the current PR.\n// Validation is NOT route authentication: the host must attest that the\n// proposal came from the dedicated ship route.
export const RESONANCE_SCHEMA='wayglass.nervous-system.resonance/v1';
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const str=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\x00-\x1f]/.test(v);
export function validateResonance(proposal,{verifiedShipRoute=false}={}){
 if(!verifiedShipRoute)throw new Error('Verified Wayglass ship route required');
 if(!proposal||typeof proposal!=='object'||Array.isArray(proposal))throw new TypeError('Resonance object required');
 const keys=['schema','id','name','meaning','tones','visual','motion','rooms'];
 if(Object.keys(proposal).sort().join('|')!==keys.sort().join('|')||proposal.schema!==RESONANCE_SCHEMA)
  throw new TypeError('Unknown resonance fields');
 if(!str(proposal.id,64)||!/^[a-z0-9][a-z0-9-]*$/.test(proposal.id)||!str(proposal.name,80)||!str(proposal.meaning,400))
  throw new TypeError('Invalid resonance identity');
 if(!Array.isArray(proposal.tones)||proposal.tones.length>8)throw new TypeError('Invalid tone collection');
 for(const t of proposal.tones){
  if(!t||Object.keys(t).sort().join('|')!=='duration_s|frequency_hz|gain|pan'||
    !finite(t.frequency_hz,20,16000)||!finite(t.gain,0,.08)||!finite(t.duration_s,.02,8)||!finite(t.pan,-1,1))
   throw new TypeError('Invalid or unsafe tone');
 }
 if(!proposal.visual||Object.keys(proposal.visual).sort().join('|')!=='colour|glyph'||
  !/^#[0-9a-f]{6}$/i.test(proposal.visual.colour)||!str(proposal.visual.glyph,48))
  throw new TypeError('Invalid visual');
 if(!proposal.motion||Object.keys(proposal.motion).sort().join('|')!=='curl|pulse'||
   !finite(proposal.motion.curl,0,1)||!finite(proposal.motion.pulse,0,1))
  throw new TypeError('Invalid motion');
 if(!Array.isArray(proposal.rooms)||proposal.rooms.length>40||!proposal.rooms.every(r=>str(r,100)))
  throw new TypeError('Invalid room scope');
 return structuredClone(proposal);
}
export function resolveResonanceForRoom(resonance,roomId){
 return resonance.rooms.includes('*')||resonance.rooms.includes(roomId)?resonance:null;
}
export function resonancePlaybackAllowed({audioOptIn=false,feather=false,muted=false}={}){
 return audioOptIn&&!feather&&!muted;
}
