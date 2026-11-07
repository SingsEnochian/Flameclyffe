// Wayglass Quad Eightfold: sourced host data -> entire ship, no hidden telemetry.
export const QUAD_EVENT='wayglass:quad-gestalt';
let latest=null;
let feather=false;
export function quadFeatherState(){return feather;}
export function readLatestQuadGestalt(){return latest;}
export function subscribeQuadGestalt(listener,{scope=globalThis}={}){
  const fn=e=>listener(e.detail);
  scope.addEventListener?.(QUAD_EVENT,fn);
  return ()=>scope.removeEventListener?.(QUAD_EVENT,fn);
}
export function publishQuadGestalt(checkpoint,{scope=globalThis}={}){
  if(checkpoint?.schema!=='wayglass.quad-checkpoint/v1'
    ||checkpoint.gestalt?.schema!=='wayglass.quad-gestalt/v1')
    throw new TypeError('Quad host checkpoint required');
  // Only metadata projections circulate: no private continuity or training records.
  const detail=Object.freeze({
    schema:'wayglass.quad-ship-observation/v1',
    checkpoint_hash:checkpoint.hash,completed_cycles:checkpoint.completed_cycles,
    observed_at:checkpoint.source_packet?.observed_at,
    evidence:checkpoint.gestalt.evidence.map(e=>({...e})),
    soundstage:checkpoint.gestalt.soundstage.map(x=>({...x})),
    gaps:[...checkpoint.gestalt.gaps],
    mode:'host-observed-metadata-projection',sound_autoplay:false,
    model_training_completed:false,
  });
  latest=detail;
  if(typeof scope.dispatchEvent==='function'&&typeof scope.CustomEvent==='function')
    scope.dispatchEvent(new scope.CustomEvent(QUAD_EVENT,{detail}));
  return detail;
}
export async function runLiveQuad({cycles=2,previous=null,continuity={},signal,fetchImpl=globalThis.fetch}={}){
  if(feather)throw new Error('Feather Stop is active');
  const response=await fetchImpl('/api/v1/wayglass/quad/run',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    credentials:'same-origin',signal,
    body:JSON.stringify({cycles,previous,continuity,feather}),
  });
  let payload;try{payload=await response.json();}catch{payload={};}
  if(!response.ok)throw new Error(payload.error||'Quad live observation unavailable');
  if(payload?.schema!=='wayglass.quad-host-response/v1'
    ||payload.checkpoint?.schema!=='wayglass.quad-checkpoint/v1')
    throw new Error('Malformed Quad host response');
  publishQuadGestalt(payload.checkpoint);
  return payload.checkpoint;
}
export function installQuadFeatherListener(scope=globalThis){
  const onFeather=event=>{
    if(event?.detail?.stopped===true)feather=true;
    else if(event?.detail?.stopped===false&&event.detail?.confirmed===true)feather=false;
  };
  scope.addEventListener?.('wayglass:feather',onFeather);
  return ()=>scope.removeEventListener?.('wayglass:feather',onFeather);
}
