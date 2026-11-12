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

/**
 * Explicit, abortable projection playback. The caller owns consent, focus and Feather.
 * The default emitter only dispatches local, non-authoritative UI events.
 */
export async function playAtlasMotion(plan,{signal,onFrame=emitAtlasMotionFrame,
  frameDelayMs=80,reducedMotion=false,schedule=(fn,ms)=>setTimeout(fn,ms),
  cancel=id=>clearTimeout(id)}={}){
  if(plan?.schema!==ATLAS_MOTION_SCHEMA||plan.membraneVerified!==true||
    plan.executed!==false||!Array.isArray(plan.frames)||plan.frames.length<3)
    throw new TypeError('Verified, unexecuted atlas motion plan required');
  if(typeof onFrame!=='function'||typeof schedule!=='function'||typeof cancel!=='function')
    throw new TypeError('Playback callbacks required');
  if(!Number.isFinite(frameDelayMs)||frameDelayMs<16||frameDelayMs>500)
    throw new RangeError('frameDelayMs must be 16 to 500');
  if(signal?.aborted)return Object.freeze({status:'feather-stopped',framesEmitted:0});
  const frames=reducedMotion?[plan.frames.at(-1)]:plan.frames;
  let emitted=0;
  for(let i=0;i<frames.length;i++){
    if(signal?.aborted)return Object.freeze({status:'feather-stopped',framesEmitted:emitted});
    onFrame(frames[i]);emitted++;
    if(i===frames.length-1)break;
    const continued=await new Promise(resolve=>{
      let settled=false;
      let timer;
      const finish=value=>{
        if(settled)return;
        settled=true;
        signal?.removeEventListener?.('abort',abort);
        resolve(value);
      };
      const abort=()=>{cancel(timer);finish(false);};
      signal?.addEventListener?.('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      timer=schedule(()=>finish(true),frameDelayMs);
    });
    if(!continued)return Object.freeze({status:'feather-stopped',framesEmitted:emitted});
  }
  return Object.freeze({status:'completed',framesEmitted:emitted});
}

/**
 * Native WTL bridge: Wyrdrune owns the expression and phase ordering;
 * the host verifies the atlas and membrane. It does NOT start playback.
 */
export function createAtlasMotionBridges({atlas,graph,universeId,from,to,gatewayId,
  channel='movement',steps=16}={}){
  if(!(atlas instanceof TypedRuneAtlas)||!(graph instanceof RelationalWorldGraph))
    throw new TypeError('Atlas and world graph required');
  const issued=new WeakSet();
  return Object.freeze({atlas:Object.freeze({
    plan:async({arguments:args})=>{
      if(!Array.isArray(args)||args.length!==2||
        args[0]?.kind!=='wyrdrune.atlas-ref/v1'||args[1]?.kind!=='wyrdrune.atlas-ref/v1'||
        args[0].universeId!==universeId||args[1].universeId!==universeId||
        args[0].entryId!==from||args[1].entryId!==to)
        throw new TypeError('WTL passage references do not match the selected atlas route');
      const plan=await planAtlasMotion({atlas,graph,universeId,from,to,gatewayId,channel,steps});
      issued.add(plan);
      return plan;
    },
    verify:async({arguments:args})=>{
      const plan=args?.[0];
      if(!plan||!issued.has(plan)||plan.schema!==ATLAS_MOTION_SCHEMA||
        plan.membraneVerified!==true||plan.executed!==false)
        throw new Error('Unknown or invalid Wyrdrune passage plan');
      const snapshot=await graph.snapshot();
      if(snapshot.revision!==plan.graphRevision)
        throw new Error('Atlas passage became stale before Verify');
      return true;
    },
  })});
}
