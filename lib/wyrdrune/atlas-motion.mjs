// Wyrdrune atlas motion v0.1: a verified, bounded digital passage projection.
// Motion is simulated; this module neither moves a participant nor actuates hardware.
import {TypedRuneAtlas} from './typed-atlas.mjs';
import {RelationalWorldGraph} from './relational-worlds.mjs';

export const ATLAS_MOTION_SCHEMA='wyrdrune.atlas-motion/v1';
const text=(s,label)=>{
  if(typeof s!=='string'||!s.trim()||s.length>256)throw new TypeError(label+' must be nonempty text');
  return s;
};
const frozen=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const v of Object.values(value))frozen(v);
    Object.freeze(value);
  }
  return value;
};
const sameAddress=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function planAtlasMotion({atlas,graph,universeId,from,to,gatewayId,
  channel='movement',steps=16,direction='forward'}={}){
  if(!(atlas instanceof TypedRuneAtlas)||!(graph instanceof RelationalWorldGraph))
    throw new TypeError('TypedRuneAtlas and RelationalWorldGraph required');
  text(channel,'channel');
  if(!Number.isSafeInteger(steps)||steps<2||steps>64)throw new RangeError('steps must be 2 to 64');
  if(from===to)throw new TypeError('Motion needs distinct destinations');
  const route=atlas.planPassage({universeId,from,to,gatewayId});
  const origin=atlas.get(from),destination=atlas.get(to),gate=atlas.get(gatewayId);
  if(!gate.rune&&!gate.coordinates)throw new Error('Gateway must be bound before verifying passage');
  const before=await graph.snapshot();
  for(const entry of [origin,destination]){
    const address=entry.rune||entry.coordinates;
    if(!address)throw new Error('Unbound destination');
    const world=await graph.resolve(address);
    if(world.id!==entry.id)throw new Error('Atlas and world graph identities disagree');
    if(entry.rune&&!sameAddress(world.rune,entry.rune))
      throw new Error('Atlas rune does not match world graph');
    if(entry.coordinates&&!sameAddress(world.coordinates,entry.coordinates))
      throw new Error('Atlas coordinates do not match world graph');
  }
  const transition=await graph.transition({from,to,channel,direction});
  // A typed gateway must correspond to the explicitly authorised membrane,
  // not merely be an unrelated gateway in the same fictional universe.
  if(transition.membrane!==gatewayId)throw new Error('Gateway does not match verified membrane');
  const after=await graph.snapshot();
  if(before.revision!==after.revision)throw new Error('Graph changed during route verification');
  const membrane=after.connections.find(c=>c.id===gatewayId);
  if(!membrane||membrane.withness!==true||!(membrane.permeability[channel]>0))
    throw new Error('A permeable Withness membrane is required');
  const coordinateMotion=Boolean(origin.coordinates&&destination.coordinates);
  const frames=Array.from({length:steps+1},(_,i)=>{
    const progress=i/steps;
    const eased=progress*progress*(3-2*progress);
    const position=coordinateMotion?{
      universe:universeId,branch:progress===1?destination.coordinates.branch:origin.coordinates.branch,
      x:origin.coordinates.x+(destination.coordinates.x-origin.coordinates.x)*eased,
      y:origin.coordinates.y+(destination.coordinates.y-origin.coordinates.y)*eased,
      z:origin.coordinates.z+(destination.coordinates.z-origin.coordinates.z)*eased,
      time:origin.coordinates.time+(destination.coordinates.time-origin.coordinates.time)*eased,
    }:null;
    return frozen({schema:'wyrdrune.atlas-motion-frame/v1',index:i,progress,eased,
      position,positionIsSimulated:true,permeability:transition.permeability,
      // This is a presentation frame, not a world-state mutation.
      executed:false,physicalActuation:false});
  });
  return frozen({schema:ATLAS_MOTION_SCHEMA,universeId,from,to,gatewayId,
    channel,direction,graphRevision:after.revision,
    atlasPassage:route.kind,membraneVerified:true,withness:true,
    coordinatesAvailable:coordinateMotion,frames,
    authorizedForPhysicalTravel:false,executed:false,
    origin:'wayglass:simulated-relational-navigation'});
}
export function emitAtlasMotionFrame(frame,{scope=globalThis}={}){
  if(frame?.schema!=='wyrdrune.atlas-motion-frame/v1'||frame.executed!==false||
    frame.physicalActuation!==false||frame.positionIsSimulated!==true)
    throw new TypeError('Verified simulated atlas motion frame required');
  const Event=scope.CustomEvent||globalThis.CustomEvent;
  if(typeof Event==='function'&&typeof scope.dispatchEvent==='function')
    scope.dispatchEvent(new Event('wayglass:atlas-motion-frame',{detail:frame}));
  return frame;
}
