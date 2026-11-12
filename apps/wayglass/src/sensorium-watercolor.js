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
  const color='hsl('+Math.round(hue)+' 48% '+Math.round(32+light*42)+'%)';
  return Object.freeze({x:.5+pan*.29,y:.38+terrain*.28,color,
    amount:.18+light*.35,radius:.035+refraction*.075,
    dx:pan*.16,dy:(gravity-1)*.09,
    provenance:'local-Wyrdrune-simulation',persist:false});
}
