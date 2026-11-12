import {SENSORIUM_FRAME_SCHEMA} from './sensorium-frame.js';
// Deterministic local WTL-to-watercolour translation. Never creates agent evidence.
export function sensoriumWatercolorImpulse(frame){
  if(frame?.schema!==SENSORIUM_FRAME_SCHEMA||frame.measured!==false||
    frame.origin!=='local:mythience-instrument'||frame.physical_actuation!==false)
    throw new TypeError('Validated local sensorium frame required');
  const bounded=(key,min,max)=>{
    const n=frame[key];
    if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new RangeError('Invalid '+key);
    return n;
  };
  const hue=bounded('hue',165,225),gravity=bounded('simulated_gravity',.35,2.001);
  const terrain=bounded('terrain_fold',0,1),refraction=bounded('simulated_refraction',.08,.931);
  const light=bounded('light',.1,.8),pan=bounded('pan',-1,1);
  // Fluid engine accepts #RRGGBB, not CSS hsl().
  const saturation=.48,luminance=(32+light*42)/100;
  const chroma=(1-Math.abs(2*luminance-1))*saturation;
  const segment=(hue/60)%2;
  const x=chroma*(1-Math.abs(segment-1));
  const m=luminance-chroma/2;
  const channels=hue<180?[0,chroma,x]:[0,x,chroma];
  const color='#'+channels.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
  return Object.freeze({x:.5+pan*.29,y:.38+terrain*.28,color,
    amount:.18+light*.35,radius:.035+refraction*.075,
    dx:pan*.16,dy:(gravity-1)*.09,
    provenance:'local-Wyrdrune-simulation',persist:false});
}
