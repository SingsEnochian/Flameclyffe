import {wayglassSomaticSound} from '../somatic-sound.js';
import {compileWyrdruneInterface} from '../wtl-interface-executable.js';
import {renderWtlInterfaceProposal} from '../wtl-interface-atelier.js';
import {listWayglassSurfaces} from '../surface-registry.js';
import {readWayglassRouteObservation,subscribeWayglassObserver} from '../living-observer-model.js';

// A real instrument: only registered rooms, actual route receipts and actual audio state.
// No model-generated UI, WTL compilation or identity decision is claimed.
export function atelierRuntimeSnapshot({surfaces=listWayglassSurfaces(),route=readWayglassRouteObservation(),sound=wayglassSomaticSound.snapshot()}={}){
 const rooms=surfaces.filter(s=>typeof s?.surface_id==='string'&&s.surface_id.trim().length>0&&typeof s?.mount==='function')
   .map(s=>({id:s.surface_id,label:String(s.label||s.surface_id).slice(0,120)}));
 return Object.freeze({schema:'wayglass.atelier-runtime/v1',source:'local-registered-runtime',
  rooms:Object.freeze(rooms.map(x=>Object.freeze(x))),route:route?Object.freeze({
   status:route.status,route_id:route.route_id,provider:route.provider,model:route.model,
   sequence:route.sequence}):null,
  sound:Object.freeze({audio_enabled:sound.audio_enabled===true,haptics_enabled:sound.haptics_enabled===true,
   feather_stopped:sound.feather_stopped===true})});
}
export function mountWtlInterfaceAtelier(root,{
 document:doc=root?.ownerDocument||globalThis.document,
 surfaces=listWayglassSurfaces,subscribe=subscribeWayglassObserver,
 readRoute=readWayglassRouteObservation,sound=wayglassSomaticSound,
 navigate=id=>globalThis.__wayglassOS?.mount(id),
}={}){
 if(!root||!doc)throw new TypeError('Atelier requires a document and mount root');
 let disposed=false;
 const section=doc.createElement('section');section.className='wg-surface wg-wtl-runtime';section.dataset.surface='wtl-interface-atelier';
 const title=doc.createElement('h1');title.textContent='Wayglass · Living Interface';
 const explanation=doc.createElement('p');explanation.textContent='Live local ship instruments. Rooms are read from the registered Wayglass runtime; route status comes from actual observed transport. The bounded Wyrdrune interface dialect can compile and run locally below. Model-authored self-design still requires an authenticated, attributable proposal.';
 const editor=doc.createElement('textarea');editor.setAttribute('aria-label','Executable Wyrdrune interface source');editor.spellcheck=false;editor.placeholder='interface {\n  title "My helm"\n  material opaline\n  heading "Welcome"\n  action feather "Feather"\n}';
 const execute=doc.createElement('button');execute.type='button';execute.textContent='Compile and run Wyrdrune';
 const authored=doc.createElement('div');authored.className='wg-wtl-atelier-stage';authored.setAttribute('aria-label','Compiled Wyrdrune interface');
 const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const execution=doc.createElement('p');execution.setAttribute('role','status');execution.setAttribute('aria-live','polite');
 const stage=doc.createElement('div');stage.className='wg-wtl-atelier-stage';
 const helm=doc.createElement('div');helm.className='wg-wtl-atelier-preview';helm.dataset.material='labradorite';
 const route=doc.createElement('p');route.setAttribute('role','status');
 const audio=doc.createElement('p');
 const rooms=doc.createElement('nav');rooms.setAttribute('aria-label','Registered Wayglass rooms');
 const feather=doc.createElement('button');feather.type='button';feather.textContent='Feather · stop sensory output';feather.className='wg-wtl-atelier-action';
 const soundButton=doc.createElement('button');soundButton.type='button';soundButton.className='wg-wtl-atelier-action';
 const refresh=()=>{
  if(disposed)return;
  const snap=atelierRuntimeSnapshot({surfaces:surfaces(),route:readRoute(),sound:sound.snapshot()});
  route.textContent=snap.route?`Observed route: ${snap.route.status} · ${snap.route.route_id||'unlabelled'} · ${snap.route.provider||'provider unreported'} / ${snap.route.model||'model unreported'}`:'No model transport observed in this browser session.';
  audio.textContent=snap.sound.feather_stopped?'Feather is active. Audio and haptics stopped.':snap.sound.audio_enabled?'Browser sound enabled by owner.':'Browser sound off.';
  soundButton.textContent=snap.sound.audio_enabled?'Stop sound':'Enable browser sound';
  soundButton.disabled=snap.sound.feather_stopped;
  rooms.replaceChildren();
  for(const item of snap.rooms){
   const button=doc.createElement('button');button.type='button';button.textContent=item.label;button.dataset.room=item.id;
   button.addEventListener('click',()=>{if(disposed)return;try{const result=navigate(item.id);Promise.resolve(result).catch(e=>{status.textContent='Navigation failed: '+String(e?.message||e);});}catch(e){status.textContent='Navigation failed: '+String(e?.message||e);}});
   rooms.append(button);
  }
  status.textContent=`${snap.rooms.length} registered rooms · live local source · no simulated agent presence`;
 };
 const onFeather=()=>{sound.feather();authored.replaceChildren();execution.textContent='Feather stopped sensory output and cleared the compiled interface. Re-execute only by explicit choice.';refresh();};
 const onExecute=()=>{try{const result=compileWyrdruneInterface(editor.value);renderWtlInterfaceProposal(authored,result.proposal,{onAction:action=>{if(action==='feather')onFeather();else if(action==='open-codex'||action==='open-writing')navigate(action==='open-codex'?'wayglass:universal-codex':'wayglass:writing-room');}});execution.textContent='Executed '+result.instructions.length+' Wyrdrune IR instructions · '+result.epistemic_register+' · not a model response';}catch(e){authored.replaceChildren();execution.textContent='WTL execution refused: '+String(e?.message||e);}};
 execute.addEventListener('click',onExecute);
 const onSound=async()=>{try{if(sound.snapshot().audio_enabled)sound.stop();else await sound.enable({audio:true});refresh();}catch(e){status.textContent='Sound unavailable: '+String(e?.message||e);}};
 feather.addEventListener('click',onFeather);soundButton.addEventListener('click',onSound);
 const heading=doc.createElement('h2');heading.textContent='The ship, as it is';
 helm.append(heading,route,audio,soundButton,feather,rooms);stage.append(helm);
 section.append(title,explanation,editor,execute,execution,status,authored,stage);root.replaceChildren(section);
 const unsubscribe=subscribe(refresh);refresh();
 return ()=>{disposed=true;unsubscribe?.();feather.removeEventListener('click',onFeather);execute.removeEventListener('click',onExecute);soundButton.removeEventListener('click',onSound);};
}
