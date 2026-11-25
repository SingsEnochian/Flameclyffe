// A room-independent environment contract. Room authorship is distinct from
// visitor navigation, accessibility preferences, and participant contributions.
export const ENVIRONMENT_SCHEMA = 'wayglass.ship-environment/v1';
export const ENVIRONMENT_CHANNELS = Object.freeze([
  'lighting','pigment','fluid','materials','spatial','soundscape','transitions'
]);
export const ENVIRONMENT_ACTOR = Object.freeze({participant_id:'wayglass',route_id:'wayglass:ship'});
export function validateShipEnvironment(change,{surfaceIds=[]}={}){
  if(!change||typeof change!=='object'||Array.isArray(change))throw new TypeError('Environment change must be an object');
  if(change.schema!==ENVIRONMENT_SCHEMA||change.actor?.participant_id!==ENVIRONMENT_ACTOR.participant_id||
     change.actor?.route_id!==ENVIRONMENT_ACTOR.route_id)throw new TypeError('Unattributed ship environment');
  if(!Number.isSafeInteger(change.revision)||change.revision<1)throw new TypeError('Invalid revision');
  if(!change.rooms||typeof change.rooms!=='object'||Array.isArray(change.rooms))throw new TypeError('Missing room environments');
  for(const [id,room] of Object.entries(change.rooms)){
    if(['__proto__','prototype','constructor'].includes(id)|| (id!=='*'&&!surfaceIds.includes(id)))throw new TypeError('Unregistered room');
    if(!room||typeof room!=='object'||Array.isArray(room))throw new TypeError('Invalid room environment');
    for(const [channel,value] of Object.entries(room)){
      if(!ENVIRONMENT_CHANNELS.includes(channel))throw new TypeError('Unknown environment channel');
      if(typeof value!=='string'||value.length>160||/[<>\\x00-\\x1f]/.test(value))throw new TypeError('Invalid environment value');
    }
  }
  return structuredClone(change);
}
export function resolveShipEnvironment(change,surfaceId){
  return Object.freeze({...change?.rooms?.['*'],...(Object.hasOwn(change?.rooms ?? {},surfaceId) ? change.rooms[surfaceId] : {})});
}
export function authorizeEnvironmentChange({actor,verifiedHost=false,feather=false,expectedRevision,currentRevision}){
  if(feather)return {allowed:false,reason:'feather'};
  if(!verifiedHost||actor?.participant_id!=='wayglass'||actor?.route_id!=='wayglass:ship')
    return {allowed:false,reason:'ship-route-required'};
  if(expectedRevision!==currentRevision)return {allowed:false,reason:'stale-revision'};
  return {allowed:true,reason:'verified-ship-author'};
}
export function visitorEnvironmentAction(action){
  return ['orbit','zoom','inspect','suggest','accessibility','feather'].includes(action);
}
