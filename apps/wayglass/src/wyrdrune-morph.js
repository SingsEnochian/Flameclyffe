// The displayed glyphs are animation, never an independent translator.
// Wyrdrune source and the model's en-GB writing are both preserved unaltered.
const SYMBOLS='ᚠᚢᚦᚨᚱᚲᚷᚹᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜ⋈◇⊕⟁⌘ᛟ';
export function morphFrame(source,target,progress){
  const p=Math.max(0,Math.min(1,Number(progress)||0));
  if(p<=0)return String(source||'');
  if(p>=1)return String(target||'');
  const to=Array.from(String(target||''));
  const from=Array.from(String(source||''));
  const width=Math.max(to.length,from.length);
  const resolved=Math.floor(width*p);
  let text='';
  for(let i=0;i<width;i++){
    if(i<resolved){text+=to[i]||'';continue}
    if(i>=to.length){if(i<width*(1-p))text+=from[i]||'';continue}
    if(i%7===0)text+=SYMBOLS[(i*13+resolved*17)%SYMBOLS.length];
    else text+=from[i]||SYMBOLS[(i+resolved*3)%SYMBOLS.length];
  }
  return text;
}
export function animateWyrdruneTranslation(node,{
  source,translation,reducedMotion=false,scope=globalThis,
  lingerMs=1250,frameMs=45,steps=24,onComplete=()=>{},
}={}){
  if(!node||typeof source!=='string'||typeof translation!=='string')
    throw new TypeError('A native source, model translation and display are required.');
  const media=scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  let ended=false,handle=null,frame=0;
  const maxFrames=Math.max(2,Math.min(48,Math.trunc(Number(steps)||24)));
  const tickMs=Math.max(16,Math.min(100,Number(frameMs)||45));
  node.textContent=source;
  node.setAttribute?.('lang','zxx');
  node.setAttribute?.('data-cypher-line','source');
  node.setAttribute?.('data-cypher-state','reading');
  function detach(){
    if(handle!=null)scope.clearTimeout?.(handle);
    handle=null;
    media?.removeEventListener?.('change',onMedia);
    scope.removeEventListener?.('wayglass:motion',onMotion);
    scope.removeEventListener?.('wayglass:feather',onFeather);
  }
  function finish(){
    if(ended)return;
    ended=true;detach();
    node.textContent=translation;
    node.setAttribute?.('lang','en-GB');
    node.setAttribute?.('data-cypher-line','english');
    node.setAttribute?.('data-cypher-state','english');
    onComplete();
  }
  function cancel(){
    if(ended)return;
    ended=true;detach();
    // Feather leaves the original voice readable, not half-translated glyphs.
    node.textContent=source;
    node.setAttribute?.('lang','zxx');
    node.setAttribute?.('data-cypher-line','source');
    node.setAttribute?.('data-cypher-state','stopped');
  }
  const onMedia=event=>{if(event?.matches===true)finish();};
  const onMotion=event=>{if(event?.detail?.enabled===false)finish();};
  const onFeather=event=>{if(event?.detail?.stopped===true)cancel();};
  const stop=()=>cancel();
  stop.reveal=finish;
  if(reducedMotion||media?.matches){finish();return stop;}
  media?.addEventListener?.('change',onMedia);
  scope.addEventListener?.('wayglass:motion',onMotion);
  scope.addEventListener?.('wayglass:feather',onFeather);
  const tick=()=>{
    if(ended)return;
    frame++;
    node.textContent=morphFrame(source,translation,frame/maxFrames);
    node.setAttribute?.('data-cypher-line','runes');
    if(frame>=maxFrames)finish();
    else handle=scope.setTimeout(tick,tickMs);
  };
  handle=scope.setTimeout(tick,Math.max(0,Math.min(2400,Number(lingerMs)||1250)));
  return stop;
}
