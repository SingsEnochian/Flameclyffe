// Four reversible art studies. Deterministic from an attributed, consented bloom.
// No model call, persistence, identity mutation or canon adoption.
export const ATELIERS=Object.freeze(['pigment','crystal','ribbon','worldseed']);
export function composeAtelier(bloom,atelier='worldseed'){
 if(!ATELIERS.includes(atelier))throw Error('Unknown atelier');
 if(!bloom||bloom.schema!=='wayglass.nursery-bloom/v0.1'||!Array.isArray(bloom.filaments)||
    bloom.filaments.length<1||bloom.filaments.length>24||
    !Number.isFinite(bloom.resonance)||bloom.resonance<0||bloom.resonance>1)throw Error('Valid encounter bloom required');
 const points=bloom.filaments.map((p,i)=>{
   if(![p.x,p.y,p.z,p.scale].every(Number.isFinite)||p.scale<=0||p.scale>1)throw Error('Invalid bloom point');
   const angle=i*Math.PI*2/bloom.filaments.length;
   const position=atelier==='pigment'?[p.x*1.2,p.y*0.65,p.z]:
     atelier==='crystal'?[p.x,p.y,p.z]:
     atelier==='ribbon'?[Math.cos(angle)*1.5,Math.sin(angle*2)*0.7,p.z]:
     [p.x*1.3,p.y*0.4-0.5,p.z*1.3];
   return Object.freeze({position:Object.freeze(position),size:atelier==='worldseed'?p.scale*2:p.scale,
     shape:atelier==='pigment'?'sphere':atelier==='crystal'?'icosahedron':atelier==='ribbon'?'octahedron':'cone'});
 });
 return Object.freeze({schema:'wayglass.atelier-study/v0.1',atelier,
  points:Object.freeze(points),source_kind:bloom.kind,persisted:false,canon_adopted:false});
}
