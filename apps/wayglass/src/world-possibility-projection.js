// Read-only bridge from Wyrdrune possibility fields to Wayglass's sensory/Observer surfaces.
// Never translates a proposed world into observed physics, a model reply, or a canon change.
export const WORLD_POSSIBILITY_PROJECTION_SCHEMA='wayglass.world-possibility-projection/v1';
export function projectWorldPossibility(field,{sourceSha,sourceTime,feather=false}={}){
  if(field?.kind!=='wyrdrune.possibility-field/v1'||field.created!==false||
    typeof field.connected!=='boolean'||!Array.isArray(field.worlds)||
    field.worlds.length<2||field.worlds.length>64||
    field.worlds.some(id=>typeof id!=='string'||!id.trim())||
    new Set(field.worlds).size!==field.worlds.length)
    throw new TypeError('Uncommitted Wyrdrune possibility field required');
  if(typeof sourceSha!=='string'||!/^[0-9a-f]{40}$/.test(sourceSha))
    throw new TypeError('Exact 40-character source SHA required');
  if(typeof sourceTime!=='string'||!Number.isFinite(Date.parse(sourceTime)))
    throw new TypeError('Timestamped provenance required');
  if(typeof feather!=='boolean')throw new TypeError('Feather must be boolean');
  const count=field.worlds.length;
  return Object.freeze({
    schema:WORLD_POSSIBILITY_PROJECTION_SCHEMA,
    worlds:Object.freeze([...field.worlds]),
    connection_state:field.connected?'permeable':'unconnected',
    visual_mode:feather?'still':'possibility-ribbon',
    geometry:Object.freeze({folds:count,reciprocal:field.connected}),
    sound:Object.freeze({enabled:false,autoplay:false}),
    haptics:Object.freeze({enabled:false}),
    observer:Object.freeze({register:'computed-possibility',measured:false,
      source_sha:sourceSha,source_time:sourceTime}),
    feather,model_response:false,canon_promotion:false,
    physical_actuation:false,created:false
  });
}
