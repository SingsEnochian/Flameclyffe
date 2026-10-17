/**
 * Wayglass living glass: light responds to the user's position, not to text.
 * The DOM remains the authority for meaning, focus, content and interactions.
 * Progressive enhancement only: no added network, canvas, shader renderer,
 * participant state, or audio routing.
 */
export const MATERIAL_SURFACE_SELECTOR =
  '.panel,.pane,.seat,.hero.panel,.instrument,.masthead,.ship-mast,.mast';

export function normalizedHighlight(clientX,clientY,rect){
  if(!rect||!(rect.width>0)||!(rect.height>0))return {x:50,y:20};
  return {
    x:Math.round(Math.max(0,Math.min(100,100*(clientX-rect.left)/rect.width))),
    y:Math.round(Math.max(0,Math.min(100,100*(clientY-rect.top)/rect.height))),
  };
}
export function installWayglassMaterial(scope=globalThis.document){
  if(!scope?.addEventListener)return ()=>{};
  const win=scope.defaultView||globalThis;
  const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame=0;
  let request=null;
  const surfaces=new Set();
  const update=()=>{
    frame=0;
    if(!request)return;
    const {target,x,y}=request;
    request=null;
    const rect=target.getBoundingClientRect();
    const position=normalizedHighlight(x,y,rect);
    target.style.setProperty('--wg-highlight-x',position.x+'%');
    target.style.setProperty('--wg-highlight-y',position.y+'%');
    target.dataset.wayglassMaterial='interactive';
    surfaces.add(target);
  };
  const pointer=(event)=>{
    if(motion?.matches||event.pointerType==='touch')return;
    const target=event.target?.closest?.(MATERIAL_SURFACE_SELECTOR);
    if(!target)return;
    request={target,x:event.clientX,y:event.clientY};
    if(!frame)frame=win.requestAnimationFrame?.(update)||0;
  };
  const clear=(event)=>{
    const target=event.target?.closest?.(MATERIAL_SURFACE_SELECTOR);
    if(target&&target!==event.relatedTarget?.closest?.(MATERIAL_SURFACE_SELECTOR)){
      target.style.removeProperty('--wg-highlight-x');
      target.style.removeProperty('--wg-highlight-y');
      delete target.dataset.wayglassMaterial;
      surfaces.delete(target);
    }
  };
  const reduce=()=>{
    if(!motion?.matches)return;
    request=null;
    if(frame)win.cancelAnimationFrame?.(frame);
    frame=0;
    for(const target of surfaces){
      target.style.removeProperty('--wg-highlight-x');
      target.style.removeProperty('--wg-highlight-y');
      delete target.dataset.wayglassMaterial;
    }
    surfaces.clear();
  };
  scope.addEventListener('pointermove',pointer,{passive:true});
  scope.addEventListener('pointerout',clear,{passive:true});
  motion?.addEventListener?.('change',reduce);
  return ()=>{
    scope.removeEventListener('pointermove',pointer);
    scope.removeEventListener('pointerout',clear);
    motion?.removeEventListener?.('change',reduce);
    if(frame)win.cancelAnimationFrame?.(frame);
    for(const target of surfaces){
      target.style.removeProperty('--wg-highlight-x');
      target.style.removeProperty('--wg-highlight-y');
      delete target.dataset.wayglassMaterial;
    }
    surfaces.clear();
  };
}
if(typeof document!=='undefined'&&document.documentElement){
  installWayglassMaterial(document);
}
