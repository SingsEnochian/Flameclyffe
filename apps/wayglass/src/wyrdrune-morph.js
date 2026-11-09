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
  let stopped=false,handle=null;
  node.textContent=source;
  node.setAttribute?.('lang','zxx');
  function finish(){
    if(stopped)return;
    node.textContent=translation;
    node.setAttribute?.('lang','en-GB');
    onComplete();
  }
  if(reducedMotion){finish();return ()=>{stopped=true;}}
  let frame=0;
  const tick=()=>{
    if(stopped)return;
    frame+=1;
    node.textContent=morphFrame(source,translation,frame/steps);
    if(frame>=steps)finish();
    else handle=scope.setTimeout(tick,frameMs);
  };
  handle=scope.setTimeout(tick,lingerMs);
  return ()=>{
    stopped=true;
    if(handle!=null)scope.clearTimeout(handle);
  };
}
