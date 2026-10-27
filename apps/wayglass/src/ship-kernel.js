/**
 * N-017 shared Wayglass kernel: all eight ArcSweep/Wayglass decks, one owner.
 * UI coordination only. Canon, identity, credentials, and model authority
 * remain with explicit host routes, never inferred from browser events.
 */
export const SHIP_KERNEL_SCHEMA='wayglass.ship-kernel/v1';
export const SHIP_ROOMS=Object.freeze([
 'arcsweep:writing-room','wayglass:living-observer','wayglass:nikola-research',
 'wayglass:systems','wayglass:video-atelier','wayglass:commons',
 'wayglass:library','wayglass:toybox'
]);
export const SHIP_THEMES=Object.freeze(['bridge','labradorite','night']);
const base=Object.freeze({schema:SHIP_KERNEL_SCHEMA,deck:null,theme:'bridge',frame:'idle',
 host:'unchecked',xr_ar:false,xr_vr:false,network:'unknown',route:'none',
 route_status:'unobserved',last_error:null,checks:0,recovered:false});
export function createShipKernel({
 mount,storage=null,fetchImpl=globalThis.fetch?.bind(globalThis),
 getXR=()=>globalThis.navigator?.xr,secure=()=>globalThis.isSecureContext===true
}={}){
 if(typeof mount!=='function')throw new TypeError('Ship requires a surface mounter');
 const stored=(()=>{try{return storage?.getItem('wayglass.ship.theme/v1')}catch{return null}})();
 let state=Object.freeze({...base,theme:SHIP_THEMES.includes(stored)?stored:'bridge'});
 let disposed=false,moving=null,probe=null;
 const listeners=new Set();
 function publish(patch={}){
  if(disposed)return state;
  state=Object.freeze({...state,...patch});
  for(const cb of [...listeners]){try{cb(state)}catch{/* Subscriber has no authority */}}
  return state;
 }
 function subscribe(cb){
  if(typeof cb!=='function')throw TypeError('Observer must be a function');
  listeners.add(cb);try{cb(state)}catch{}
  return()=>listeners.delete(cb);
 }
 async function navigate(deck,{recovery=false}={}){
  if(disposed)throw Error('Ship kernel has stopped');
  if(!SHIP_ROOMS.includes(deck))throw Error('Unknown Wayglass deck');
  if(moving)return moving;
  const previous=state.deck;
  publish({frame:'moving',last_error:null});
  const operation=(async()=>{
   try{
    const result=await mount(deck);
    publish({frame:'settled',deck,recovered:recovery,last_error:null});
    return result;
   }catch(error){
    publish({frame:'fault',deck:previous,last_error:String(error?.message||error).slice(0,220)});
    throw error;
   }
  })();
  moving=operation;
  try{return await operation}finally{if(moving===operation)moving=null}
 }
 function theme(name){
  if(!SHIP_THEMES.includes(name))throw Error('Unsupported ship theme');
  try{storage?.setItem('wayglass.ship.theme/v1',name)}catch{}
  return publish({theme:name});
 }
 function route({status,routeId}={}){
  if(!['started','completed','failed'].includes(status))return state;
  return publish({route:String(routeId||'unnamed').slice(0,90),route_status:status});
 }
 async function health(){
  if(disposed)throw Error('Ship kernel has stopped');
  if(probe)return probe;
  const task=(async()=>{
   let host='unavailable';
   if(typeof fetchImpl==='function'){
    try{
     const response=await fetchImpl('/api/v1/wayglass/routes',{
      cache:'no-store',signal:AbortSignal.timeout(2200)});
     host=response.ok?'responding':response.status===401||response.status===403?'sign-in-required':'unavailable';
    }catch{host='unavailable'}
   }
   let xr_ar=false,xr_vr=false;
   const xr=getXR();
   if(secure()&&typeof xr?.isSessionSupported==='function'){
    try{xr_ar=await xr.isSessionSupported('immersive-ar')===true}catch{}
    try{xr_vr=await xr.isSessionSupported('immersive-vr')===true}catch{}
   }
   return publish({host,xr_ar,xr_vr,checks:state.checks+1});
  })();
  probe=task;
  try{return await task}finally{if(probe===task)probe=null}
 }
 function reportFailure(error){return publish({frame:'fault',last_error:String(error?.message||error).slice(0,220)})}
 function destroy(){disposed=true;listeners.clear()}
 return Object.freeze({
  get state(){return state},subscribe,navigate,theme,route,health,reportFailure,destroy,
  get rooms(){return SHIP_ROOMS}
 });
}
