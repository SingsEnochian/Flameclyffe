// Pure, host-neutral projection of ship-authored resonance into sensory,
// Wyrdrune, Observer and Return lanes. Does not trigger audio or inference.
export const BRIDGE_SCHEMA='wayglass.nervous-system.bridge/v1';
const validId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
const clone=value=>JSON.parse(JSON.stringify(value));
export function projectResonance({resonance,revision,source,feather=false,audioOptIn=false,hapticsOptIn=false}={}){
 if(feather)return Object.freeze({schema:BRIDGE_SCHEMA,status:'feather-stopped',projections:[]});
 if(!resonance||!validId(resonance.id)||!Number.isSafeInteger(revision)||revision<1||
 !source||!validId(source.participant_id)||!validId(source.route_id)||
 typeof source.receipt_id!=='string'||!source.receipt_id.trim())throw new TypeError('Verified source metadata required');
 const tones=resonance.tones;
 if(!Array.isArray(tones)||tones.length>8||!tones.every(t=>
 typeof t.frequency_hz==='number'&&Number.isFinite(t.frequency_hz)&&t.frequency_hz>=20&&t.frequency_hz<=16000&&
 typeof t.gain==='number'&&Number.isFinite(t.gain)&&t.gain>=0&&t.gain<=.08&&
 typeof t.duration_s==='number'&&Number.isFinite(t.duration_s)&&t.duration_s>=.02&&t.duration_s<=8&&
 typeof t.pan==='number'&&Number.isFinite(t.pan)&&t.pan>=-1&&t.pan<=1))throw new TypeError('Invalid tones');
 if(!resonance.visual||!/^#[0-9a-f]{6}$/i.test(resonance.visual.colour)||
 typeof resonance.visual.glyph!=='string'||resonance.visual.glyph.length>48||
 !resonance.motion||![resonance.motion.curl,resonance.motion.pulse].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))
 throw new TypeError('Invalid projection');
 const provenance=Object.freeze({participant_id:source.participant_id,route_id:source.route_id,receipt_id:source.receipt_id,revision});
 const projections=[
 {lane:'wyrdrune',kind:'resonance-token',id:resonance.id,provenance},
 {lane:'sensory',kind:'visual',colour:resonance.visual.colour,glyph:resonance.visual.glyph,motion:clone(resonance.motion),provenance},
 {lane:'observer',kind:'proposed-resonance',id:resonance.id,provenance},
 {lane:'return',kind:'proposed-checkpoint',id:resonance.id,provenance}
 ];
 if(audioOptIn)projections.push({lane:'sensory',kind:'audio',tones:clone(tones),provenance});
 if(hapticsOptIn)projections.push({lane:'sensory',kind:'haptic-intent',id:resonance.id,provenance});
 return Object.freeze({schema:BRIDGE_SCHEMA,status:'projection-only',projections});
}
