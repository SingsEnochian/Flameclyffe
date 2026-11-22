/**
 * Wayglass ship visualiser: deterministic render geometry for a sensory observation.
 * Heuristics and imagery are original, informed by a generally known separation of
 * deterministic simulation from rendering (also examined in Molequle, MIT).
 * This does not import Molequle physics, identity, or its local REST API.
 */
export const VISUALISER_SCHEMA='wayglass.ship.harmonic-visualiser/v0.1';
export const WORLD_COLOURS=Object.freeze({
  'terra-aeterna':Object.freeze({hue:172,accent:41}),
  'luna':Object.freeze({hue:204,accent:278}),
  starsong:Object.freeze({hue:273,accent:194}),
  'hearthweave-foundation':Object.freeze({hue:149,accent:39}),
  kelyran:Object.freeze({hue:190,accent:295}),
  custom:Object.freeze({hue:187,accent:50}),
});
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
function mix(n){let x=n|0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
export function frequencyToRing(hz,{rootHz=220}={}){
  if(!Number.isFinite(hz)||hz<20||hz>8000)throw new RangeError('Frequency outside audible design input');
  const root=Number(rootHz);
  if(!Number.isFinite(root)||root<20||root>2000)throw new RangeError('Invalid visualiser world root');
  const octave=Math.log2(hz/root);
  return Object.freeze({
    octave,
    radius:clamp(.20+.105*octave,.08,.85),
    sweep:2*Math.PI*(octave-Math.floor(octave)),
    radialSegments:clamp(Math.round(9+Math.abs(octave)*7),9,54),
  });
}
export function visualiserFrame({
  worldId='terra-aeterna',rootHz=220,notes=[],elapsed=0,motion=true,
}={}){
  if(!Array.isArray(notes))throw new TypeError('notes must be a bounded list');
  const palette=WORLD_COLOURS[worldId]||WORLD_COLOURS.custom;
  const seconds=Number.isFinite(elapsed)?clamp(elapsed,0,86400):0;
  const active=notes.slice(0,16).filter(n=>n&&Number.isFinite(n.frequency_hz)&&n.frequency_hz>=20&&n.frequency_hz<=8000).map((n,index)=>{
    const ring=frequencyToRing(n.frequency_hz,{rootHz});
    const level=clamp(Number(n.velocity)||80,0,127)/127;
    const angle=(ring.sweep+index*2.399963229728653+(motion?seconds*.26:0))%(2*Math.PI);
    return Object.freeze({
      id:typeof n.id==='string'?n.id.slice(0,60):'note-'+index,
      x:.5+Math.cos(angle)*(ring.radius*.37),
      y:.5+Math.sin(angle)*(ring.radius*.35),
      radius:ring.radius,
      frequency_hz:n.frequency_hz,
      intensity:.25+.75*level,
      hue:(palette.hue+index*23)%360,
      segments:ring.radialSegments,
    });
  });
  const nodes=Array.from({length:44},(_,index)=>{
    const rng=mix(index*1987+Math.floor(rootHz)*41+palette.hue);
    const theta=index*2.399963229728653+(motion?seconds*(.016+.01*rng):0);
    const magnitude=.12+.37*Math.sqrt((index+.5)/44);
    return Object.freeze({
      x:.5+Math.cos(theta)*magnitude,
      y:.5+Math.sin(theta)*magnitude*.79,
      radius:1.2+2.1*rng,
      intensity:.12+.15*rng+(active.length>0?0.09:0),
      hue:palette.hue,
    });
  });
  return Object.freeze({
    schema:VISUALISER_SCHEMA,
    world_id:worldId,
    active_note_count:active.length,
    elapsed_s:seconds,
    palette,
    nodes:Object.freeze(nodes),
    notes:Object.freeze(active),
    nature:'display-only-geometry',
    authority:false,
    identity_attested:false,
    world_crossing:false,
  });
}
