// Provenance-only accumulation. Wyrdrune alone determines frequency,
// harmonics and the interpretation of these independently observed scalars.
export const ATLAS_SCOPE_STORE_SCHEMA='wayglass.atlas-scopes/v0.1';
const SAFE_SCOPE=/^[\p{L}\p{N}:._/-]{1,100}$/u;
const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
const average=items=>items.reduce((sum,value)=>sum+value,0)/items.length;

export function createResonanceScopeStore({limit=256}={}) {
  if(!Number.isInteger(limit)||limit<8||limit>256)throw new TypeError('Atlas scope capacity must be 8–256.');
  const records=[];
  let current=Object.freeze({room:'wayglass:spectral-field',world:'wayglass:universe-default'});
  function setScope({room=current.room,world=current.world}={}){
    if(typeof room!=='string'||!SAFE_SCOPE.test(room)||typeof world!=='string'||!SAFE_SCOPE.test(world)){
      throw new TypeError('Atlas room and world scope names must be bounded canonical references.');
    }
    const changed=room!==current.room||world!==current.world;
    const worldChanged=world!==current.world;
    current=Object.freeze({room,world});
    return Object.freeze({...current,changed,worldChanged});
  }
  function scope(){return current;}
  function record({event_id,source_ref,bloom,scope_ref=current}={}){
    if(typeof event_id!=='string'||!/^[\w.:-]{1,96}$/.test(event_id))throw new TypeError('Atlas requires a bounded event receipt.');
    if(typeof source_ref!=='string'||!/^wayglass:[a-z0-9-]{1,72}$/.test(source_ref))throw new TypeError('Atlas requires a Wayglass source receipt.');
    if(!positive(bloom))throw new TypeError('Atlas requires a bounded Wyrdrune bloom scalar.');
    if(!scope_ref||!SAFE_SCOPE.test(scope_ref.room)||!SAFE_SCOPE.test(scope_ref.world))throw new TypeError('Atlas scope is invalid.');
    const item=Object.freeze({event_id,source_ref,bloom,room:scope_ref.room,world:scope_ref.world});
    records.push(item);
    if(records.length>limit)records.shift();
    return item;
  }
  function snapshot(event_id=records.at(-1)?.event_id){
    const last=[...records].reverse().find(record=>record.event_id===event_id);
    if(!last)return null;
    const room=records.filter(r=>r.world===last.world&&r.room===last.room);
    const world=records.filter(r=>r.world===last.world);
    const worldGroups=new Map();
    for(const r of records){
      if(!worldGroups.has(r.world))worldGroups.set(r.world,[]);
      worldGroups.get(r.world).push(r.bloom);
    }
    const equalWorldMeans=[...worldGroups.values()].map(values=>average(values));
    return Object.freeze({
      schema:ATLAS_SCOPE_STORE_SCHEMA,
      event_id:last.event_id,
      scopes:Object.freeze({room:last.room,world:last.world}),
      scalars:Object.freeze({
        instant:last.bloom,room:average(room.map(r=>r.bloom)),
        world:average(world.map(r=>r.bloom)),
        universe:average(equalWorldMeans),
      }),
      counts:Object.freeze({
        instant:1,room:room.length,world:world.length,universe:worldGroups.size,
      }),
      provenance:Object.freeze({
        source_ref:last.source_ref,
        event_refs:Object.freeze(world.map(r=>r.event_id)),
      }),
    });
  }
  function clear(){records.splice(0,records.length)}
  function inspect(){return Object.freeze({schema:ATLAS_SCOPE_STORE_SCHEMA,size:records.length,scope:current,
    distinct_worlds:new Set(records.map(r=>r.world)).size,limit})}
  return Object.freeze({setScope,scope,record,snapshot,inspect,clear});
}
