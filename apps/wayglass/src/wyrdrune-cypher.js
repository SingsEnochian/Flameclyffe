// Native Wyrdrune -> intermediate runes -> deterministic en-GB gloss.
// The compiled source is never executed or replaced. This is a visual projection;
// the text is not a generated paraphrase, model reply or materialised world crossing.
import { morphFrame } from './wyrdrune-morph.js';
import { glossProgram } from '../../../lib/wyrdrune/gloss.mjs';
import { createWyrdruneRuntime } from '../../../lib/wyrdrune/runtime.mjs';
import { WAYGLASS_FEATHER_EVENT } from './somatic-sound.js';

const reader=createWyrdruneRuntime({hashSource:()=>'local-gloss-only'});
export function readWyrdrune(source){
  return glossProgram(reader.compile(String(source??'')));
}

/**
 * Morph WTL into a compiled, source-faithful British English reading.
 * - An AT transcript is readable without announcing every intermediate glyph.
 * - OS reduced-motion, Feather, manual stop and disabled Wayglass motion settle all lines.
 * - A bounded overlap prevents large valid programmes from taking minutes to decode.
 * - No source execution, model request or automatic sound.
 */
export function animateWyrdruneCypher(container,{
  source,reducedMotion=false,scope=globalThis,doc=globalThis.document,
  frameMs=36,steps=16,overlap=.45,onPhase=()=>{},onComplete=()=>{},
}={}){
  if(!container||!doc)throw new TypeError('A display and document are required.');
  const gloss=readWyrdrune(source);
  const el=(tag,cls,text)=>{
    const node=doc.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=text;
    return node;
  };
  const lines=[];
  container.replaceChildren();
  container.setAttribute('aria-live','off');
  container.setAttribute('aria-busy','true');
  container.setAttribute('data-cypher-state','reading');
  const head=el('p','wg-cypher-note tiny','Native Wyrdrune · runes · en-GB · source-faithful reading');
  container.append(head);
  for(const o of gloss.operators){
    const row=el('p','wg-cypher-line',o.wtl);
    row.setAttribute('lang','zxx');
    row.setAttribute('data-cypher-line','source');
    container.append(row);
    lines.push({node:row,from:o.wtl,to:o.english,phase:'operator'});
  }
  for(const unit of gloss.units){
    container.append(el('p','wg-cypher-unit',unit.title));
    for(const phase of unit.phases){
      const block=el('div','wg-cypher-phase');
      block.setAttribute('data-phase',phase.phase);
      block.append(el('span','wg-cypher-phase-name',
        phase.phase[0].toUpperCase()+phase.phase.slice(1)+' · '+phase.meaning));
      for(const line of phase.lines){
        const row=el('p','wg-cypher-line'+(line.still?' wg-cypher-still':''),line.wtl||'·');
        row.setAttribute('lang','zxx');
        row.setAttribute('title',line.wtl||'empty phase');
        row.setAttribute('data-cypher-line','source');
        block.append(row);
        lines.push({node:row,from:line.wtl||'·',to:line.english,phase:phase.phase});
      }
      container.append(block);
    }
  }
  let finished=false,resolveDone;
  const done=new Promise(resolve=>{resolveDone=resolve;});
  const timers=new Set();
  const media=scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  const totalSteps=Math.max(2,Math.min(36,Math.trunc(Number(steps)||16)));
  const interval=Math.max(12,Math.min(100,Number(frameMs)||36));
  const staggerRatio=Math.max(.1,Math.min(.95,1-(Number(overlap)||.45)));
  const settle=item=>{
    if(item.settled)return;
    item.node.textContent=item.to;
    item.node.setAttribute('lang','en-GB');
    item.node.setAttribute('data-cypher-line','english');
    item.settled=true;
  };
  const finishAll=()=>{
    if(finished)return;
    finished=true;
    for(const timer of timers)scope.clearTimeout?.(timer);
    timers.clear();
    for(const item of lines)settle(item);
    container.setAttribute('aria-busy','false');
    container.setAttribute('data-cypher-state','english');
    scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
    scope.removeEventListener?.('wayglass:motion',onMotion);
    media?.removeEventListener?.('change',onMedia);
    onComplete(gloss);
    resolveDone(gloss);
  };
  const onFeather=event=>{if(event?.detail?.stopped===true)finishAll();};
  const onMotion=event=>{if(event?.detail?.enabled===false)finishAll();};
  const onMedia=event=>{if(event?.matches===true)finishAll();};
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  scope.addEventListener?.('wayglass:motion',onMotion);
  media?.addEventListener?.('change',onMedia);
  if(reducedMotion||media?.matches||!lines.length){
    finishAll();return {gloss,stop:finishAll,done};
  }
  let remaining=lines.length,previousPhase=null;
  const later=(callback,ms)=>{
    const timer=scope.setTimeout(()=>{
      timers.delete(timer);
      if(!finished)callback();
    },ms);
    timers.add(timer);
  };
  lines.forEach((item,i)=>{
    let frame=0;
    const tick=()=>{
      if(finished)return;
      if(previousPhase!==item.phase){
        previousPhase=item.phase;
        onPhase(item.phase);
      }
      frame++;
      if(frame>=totalSteps){
        settle(item);
        if(--remaining===0)finishAll();
        return;
      }
      item.node.setAttribute('data-cypher-line','runes');
      item.node.textContent=morphFrame(item.from,item.to,frame/totalSteps);
      later(tick,interval);
    };
    // Entire reading enters the luminous passage within 2.4 seconds, however
    // many statements the compiler accepts. The source remains inspectable.
    const delay=Math.min(2400,Math.round(i*totalSteps*interval*staggerRatio));
    later(tick,delay);
  });
  return {gloss,stop:finishAll,done};
}
