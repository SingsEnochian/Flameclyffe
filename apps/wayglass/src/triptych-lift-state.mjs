// Pure, auditable route and indexing semantics for the inhabited Möbius Lift.
// These names correspond to existing registered Wayglass ship surfaces.
export const LIFT_ROOMS=Object.freeze([
  'wayglass:living-watercolor',
  'wayglass:journey-before-destination',
  'wayglass:living-observer',
]);
export function liftStep(current,direction){
  if(!Number.isInteger(current)||current<0||current>2)throw new RangeError('Unknown chamber index');
  if(!Number.isInteger(direction)||Math.abs(direction)>2)throw new RangeError('Invalid lift direction');
  return Math.max(0,Math.min(2,current+direction));
}
export function liftSelection(plan,index){
  const panel=plan?.panels?.[index];
  if(!panel||panel.destination!==LIFT_ROOMS[index])
    throw new TypeError('Lift route is not a declared, allowlisted ship destination.');
  if(typeof panel.root_hz!=='number'||!Number.isFinite(panel.root_hz)||panel.root_hz<50||panel.root_hz>1000||
     typeof panel.upper_hz!=='number'||!Number.isFinite(panel.upper_hz)||panel.upper_hz<20||panel.upper_hz>1000||
     typeof panel.gain!=='number'||!Number.isFinite(panel.gain)||panel.gain<=0||panel.gain>.12)
    throw new TypeError('Lift score is not within conservative audible bounds.');
  return panel;
}
