// Host custody is only through the signed-in Wayglass House session.
// 401 is an explicit 'not connected' status, never a fabricated saved receipt.
const BASE='/api/v1/wayglass/timeline/altered';
async function read(response){
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.error||'Wayglass House checkpoint request failed');
    error.status=response.status;
    error.current_head=data.current_head||null;
    throw error;
  }
  return data;
}
export async function listAlteredTimelineHost({fetchImpl=fetch}={}){
  return read(await fetchImpl(BASE+'/checkpoints',{
    method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},
  }));
}
export async function saveAlteredTimelineHost({snapshot,expectedStorageId=null,fetchImpl=fetch,signal}={}){
  return read(await fetchImpl(BASE+'/checkpoints',{
    method:'POST',cache:'no-store',credentials:'same-origin',signal,
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({snapshot,expected_storage_id:expectedStorageId}),
  }));
}
export async function restoreAlteredTimelineHost({branchId,storageId=null,fetchImpl=fetch,signal}={}){
  if(!branchId&&!storageId)throw new TypeError('Select a House branch or exact storage receipt');
  const url=storageId?BASE+'/checkpoints/'+encodeURIComponent(storageId):
    BASE+'/latest/'+encodeURIComponent(branchId);
  const data=await read(await fetchImpl(url,{
    method:'GET',cache:'no-store',credentials:'same-origin',signal,
    headers:{Accept:'application/json'},
  }));
  if(data.schema!=='wayglass.altered-timeline-return/v1'||data.receipt?.verified!==true||
    data.snapshot?.branchId!==data.receipt?.branch_id)
    throw new TypeError('Unverified House return');
  return data;
}
