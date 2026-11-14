// Atlas DreamJob adapter: inject an authenticated server-side transport.
// No secrets or raw provider payloads are stored in Withness receipts.
export function createAtlasDreamJob({transport,record=()=>{}}={}){
  if(!transport||typeof transport.submit!=='function'||typeof transport.wait!=='function')
    throw new TypeError('Atlas transport requires submit and wait');
  const jobs=new Map();
  const safe=v=>typeof v==='string'?v.slice(0,128):null;
  const observe=(job,stage,detail={})=>record(Object.freeze({
    schema:'wayglass.atlas-dream-observation/v1',dream_id:job.dream_id,
    operation_id:job.operation_id,stage,observed_at:new Date().toISOString(),
    disposition:job.stopped?'observed-not-adopted':'dream-local-only',
    upstream_execution:job.stopped?'unknown':'not-verified',
    ...detail,
  }));
  async function start({dream_id,idempotency_key,contextFrames,targetCameras,prompt,signal}={}){
    if(!safe(dream_id)||!safe(idempotency_key))throw new TypeError('Dream identity and idempotency key required');
    if(jobs.has(idempotency_key))return jobs.get(idempotency_key).public;
    if(signal?.aborted)throw new DOMException('Dream stopped','AbortError');
    const job={dream_id:safe(dream_id),operation_id:null,stopped:false,public:null};
    const publicJob=Object.freeze({dream_id:job.dream_id,idempotency_key});
    job.public=publicJob;jobs.set(idempotency_key,job);
    observe(job,'requested');
    try{
      const operation=await transport.submit({contextFrames,targetCameras,prompt,idempotency_key,signal});
      job.operation_id=safe(operation?.id);
      if(!job.operation_id)throw new Error('Atlas operation id missing');
      observe(job,'submitted');
      if(signal?.aborted||job.stopped){job.stopped=true;observe(job,'late-submission');return publicJob;}
      return publicJob;
    }catch(error){jobs.delete(idempotency_key);observe(job,'submission-failed',{error_class:safe(error?.name)||'Error'});throw error;}
  }
  async function wait(idempotency_key,{signal}={}){
    const job=jobs.get(idempotency_key);
    if(!job||!job.operation_id)throw new Error('Unknown or pending Atlas operation');
    const operation=await transport.wait(job.operation_id,{signal});
    if(job.stopped||signal?.aborted){
      observe(job,'late-completion',{provider_done:operation?.done===true});
      return Object.freeze({status:'observed-not-adopted',operation_id:job.operation_id});
    }
    if(operation?.done!==true)return Object.freeze({status:'running',operation_id:job.operation_id});
    if(operation.error){observe(job,'failed');return Object.freeze({status:'failed',operation_id:job.operation_id});}
    observe(job,'available');
    return Object.freeze({status:'dream-local-available',operation_id:job.operation_id,
      asset_ids:Object.freeze((operation.response?.frames||[]).map(f=>safe(f.imageAsset?.assetId)).filter(Boolean))});
  }
  async function feather(idempotency_key){
    const job=jobs.get(idempotency_key);if(!job)return false;
    job.stopped=true;observe(job,'feather');
    if(job.operation_id&&typeof transport.cancel==='function'){
      try{await transport.cancel(job.operation_id);observe(job,'cancel-requested');}
      catch(error){observe(job,'cancel-request-failed',{error_class:safe(error?.name)||'Error'});}
    }
    return true;
  }
  return Object.freeze({start,wait,feather});
}
