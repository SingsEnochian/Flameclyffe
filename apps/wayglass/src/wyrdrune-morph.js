// Animation only. The compiler owns the meaning, the renderer owns visual glyphs.
// Source and English are preserved byte-for-byte; no invented translation or model.
const SYMBOLS='ᚠᚢᚦᚨᚱᚲᚷᚹᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜ⋈◇⊕⟁⌘ᛟ';
const runic=(char,index,turn)=>{
  if(!/[A-Za-z0-9]/.test(char))return char;
  const point=char.codePointAt(0)||0;
  return SYMBOLS[(point*7+index*13+turn*17)%SYMBOLS.length];
};
/**
 * A genuine visual crossing: authored WTL -> fully luminous glyph field ->
 * the precise British-English expression. The middle is deliberately unreadable
 * as ordinary prose, so the two source surfaces remain accessible side by side.
 */
export function morphFrame(source,target,progress){
  const p=Math.max(0,Math.min(1,Number(progress)||0));
  const from=String(source||''),to=String(target||'');
  if(p<=0)return from;
  if(p>=1)return to;
  // Stable glyphs during the crossing: no frame-to-frame random flicker.
  const turn=0;
  if(p<.39){
    const chars=Array.from(from);
    const transformed=Math.floor(chars.length*Math.max(0,(p-.05)/.34));
    return chars.map((ch,i)=>i<transformed?runic(ch,i,turn):ch).join('');
  }
  if(p<.62){
    // The middle stretch is actual full-script transformation, not the old
    // occasional replacement letter hiding inside otherwise normal code.
    const chars=Array.from(p<.51?from:to);
    return chars.map((ch,i)=>runic(ch,i,turn)).join('');
  }
  const chars=Array.from(to),resolved=Math.floor(chars.length*(p-.62)/.38);
  return chars.map((ch,i)=>i<resolved?ch:runic(ch,i,turn)).join('');
}
export function animateWyrdruneTranslation(node,{
  source,translation,reducedMotion=false,scope=globalThis,
  lingerMs=1500,frameMs=95,steps=40,onComplete=()=>{},
}={}){
  if(!node||typeof source!=='string'||typeof translation!=='string')
    throw new TypeError('A native source, model translation and display are required.');
  const media=scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  let ended=false,handle=null,frame=0;
  const maxFrames=Math.max(2,Math.min(48,Math.trunc(Number(steps)||40)));
  const tickMs=Math.max(16,Math.min(180,Number(frameMs)||95));
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
    node.style?.removeProperty('--rune-progress');
    node.removeAttribute?.('data-cypher-visual-phase');
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
    node.style?.removeProperty('--rune-progress');
    node.removeAttribute?.('data-cypher-visual-phase');
    node.setAttribute?.('lang','zxx');
    node.setAttribute?.('data-cypher-line','source');
    node.setAttribute?.('data-cypher-state','stopped');
  }
  const onMedia=event=>{if(event?.matches===true)finish();};
  const onMotion=event=>{if(event?.detail?.enabled===false)finish();};
  const onFeather=event=>{if(event?.detail?.stopped===true)cancel();};
  const stop=()=>cancel();
  stop.reveal=finish;
  if(reducedMotion||media?.matches||node.ownerDocument?.documentElement?.dataset?.wgMotion==='off'){finish();return stop;}
  media?.addEventListener?.('change',onMedia);
  scope.addEventListener?.('wayglass:motion',onMotion);
  scope.addEventListener?.('wayglass:feather',onFeather);
  const tick=()=>{
    if(ended)return;
    frame++;
    const progress=frame/maxFrames;
    node.textContent=morphFrame(source,translation,progress);
    node.style?.setProperty('--rune-progress',`${Math.round(progress*100)}%`);
    node.setAttribute?.('data-cypher-visual-phase',progress>=.39&&progress<.62?'full-runes':'crossing');
    node.setAttribute?.('data-cypher-line','runes');
    if(frame>=maxFrames)finish();
    else handle=scope.setTimeout(tick,tickMs);
  };
  handle=scope.setTimeout(tick,Math.max(0,Math.min(3200,Number(lingerMs)||1500)));
  return stop;
}
