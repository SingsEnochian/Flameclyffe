/**
 * Whole-ship deliberate touch gesture adapter. Two fingers must travel in
 * concert across the navigation rail. No route submission or camera access.
 */
export const SHIP_GESTURES_SCHEMA='wayglass.ship-gestures/v1';
export function classifyBridgeGesture(points,{minSwipe=95,maxDrift=75}={}){
 if(!Array.isArray(points)||points.length!==2)return null;
 const [[a0,b0],[a1,b1]]=points;
 for(const p of [a0,b0,a1,b1]){
  if(!p||![p.x,p.y].every(Number.isFinite))return null;
 }
 const dx1=b0.x-a0.x,dy1=b0.y-a0.y;
 const dx2=b1.x-a1.x,dy2=b1.y-a1.y;
 const dx=(dx1+dx2)/2,dy=(dy1+dy2)/2;
 if(Math.abs(dx)>=minSwipe&&Math.abs(dy)<maxDrift
   &&Math.sign(dx1)===Math.sign(dx2)&&Math.abs(dx1-dx2)<maxDrift*1.4)
  return dx<0?'next':'previous';
 return null;
}
export function installShipGestures(rail,{onNavigate=()=>{},enabled=true}={}){
 if(!rail)return()=>{};
 const points=new Map();let consumed=false,disposed=false,held=false;
 function down(event){
  if(!enabled||held||event.pointerType!=='touch'||disposed)return;
  if(points.size===0)consumed=false;
  if(points.size>=2)return;
  points.set(event.pointerId,{start:{x:event.clientX,y:event.clientY},
   end:{x:event.clientX,y:event.clientY}});
 }
 function move(event){
  const p=points.get(event.pointerId);
  if(p)p.end={x:event.clientX,y:event.clientY};
 }
 function up(event){
  const p=points.get(event.pointerId);
  if(!p)return;
  p.end={x:event.clientX,y:event.clientY};
  if(points.size===2&&!consumed&&!held){
   const gesture=classifyBridgeGesture([...points.values()].map(p=>[p.start,p.end]));
   if(gesture){
    consumed=true;onNavigate(gesture);
   }
  }
  points.delete(event.pointerId);
 }
 function cancel(){points.clear();consumed=false}
 function feather(event){held=event?.detail?.held===true;if(held)cancel()}
 rail.addEventListener('pointerdown',down);
 rail.addEventListener('pointermove',move);
 rail.addEventListener('pointerup',up);
 rail.addEventListener('pointercancel',cancel);
 globalThis.addEventListener?.('wayglass:feather',feather);
 return()=>{
  disposed=true;points.clear();
  rail.removeEventListener('pointerdown',down);
  rail.removeEventListener('pointermove',move);
  rail.removeEventListener('pointerup',up);
  rail.removeEventListener('pointercancel',cancel);
  globalThis.removeEventListener?.('wayglass:feather',feather);
 };
}
