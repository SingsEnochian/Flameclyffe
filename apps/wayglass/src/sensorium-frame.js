// Single bounded, non-authoritative sensorium frame for local Wayglass surfaces.
// A projection, not a measurement, participant message, canon receipt or actuator command.
export const SENSORIUM_FRAME_EVENT='wayglass:sensorium-frame';
export const SENSORIUM_FRAME_SCHEMA='wayglass.sensorium-frame/v1';
const BOUNDS=Object.freeze({
  light:[.1,.8],hue:[165,225],frequency_hz:[164.81,304.81],
  counterpart_hz:[184,397],pan:[-1,1],pulse:[.2,.851],
  virtual_below_hz:[.5,11.5],virtual_above_hz:[22000,35000],
  simulated_gravity:[.35,2.001],simulated_refraction:[.08,.931],
  terrain_fold:[0,1],tactile_intensity:[.12,.801],
});
export function normaliseSensoriumFrame(expression){
  if(expression?.schema!=='wayglass.wyrdrune-mythience-expression/v1'||expression?.measured!==false||
    expression?.canon_promotion!==false||expression?.model_response!==false)
    throw new TypeError('Local Wyrdrune projection required');
  const values={};
  for(const [key,[lo,hi]] of Object.entries(BOUNDS)){
    const value=expression[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<lo||value>hi)
      throw new RangeError('Invalid sensorium '+key);
    values[key]=value;
  }
  return Object.freeze({schema:SENSORIUM_FRAME_SCHEMA,...values,
    origin:'local:mythience-instrument',register:'simulated-digital-world',
    source_label:expression.source_label,measured:false,canon_promotion:false,
    physical_actuation:false});
}
export function emitSensoriumFrame(expression,{scope=globalThis}={}){
  const frame=normaliseSensoriumFrame(expression);
  const Custom=scope.CustomEvent||globalThis.CustomEvent;
  if(typeof Custom==='function'&&typeof scope.dispatchEvent==='function')
    scope.dispatchEvent(new Custom(SENSORIUM_FRAME_EVENT,{detail:frame}));
  return frame;
}
