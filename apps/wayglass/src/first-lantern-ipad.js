import {translateSemantic} from '../../../lib/wyrdrune/skyrunor-bridge.mjs';
import {fictionToWtl,verifyFictionExecution} from '../../../lib/wyrdrune/fiction-mobius.mjs';
import {planFictionProjection,renderApprovedFiction,restoreFictionDisplay} from '../../../lib/wyrdrune/fiction-projection.mjs';
import {planPhysicalEmbodiment} from '../../../lib/wyrdrune/world-crossing.mjs';
import {EXAMPLE_CHANGE} from '../../../lib/wyrdrune/skyrunor-change.mjs';
import {englishToDeclaration,astToGlyphs,wtlToAst} from '../../../lib/wyrdrune/skyrunor.mjs';
// Offline First Lantern: the existing canonical Wyrdrune parser/executor in Safari.
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {sha256Hex,canonicalDigest} from '../../../lib/wyrdrune/browser-canonical.mjs';
import {wtlToEnglish,englishToWtl,wtlToGlyphTransport,glyphTransportToWtl,roundTripWtl} from '../../../lib/wyrdrune/bidirectional.mjs';
const runtime=createWyrdruneRuntime({hashSource:sha256Hex,continuityDigest:canonicalDigest});
const by=id=>document.getElementById(id),source=by('wtl'),english=by('english'),runes=by('runes');
const status=by('status'),output=by('output'),receipt=by('receipt'),detail=by('details');
const ORIGINAL=source.value,STORE='wayglass:first-lantern:local-return/v1';
let active=null,last=null,proposalOnly=false,stagedFiction=null;
let acceptedFiction=null,projectionAbort=null,fictionSound=null;
function stopCue({clear=false}={}){
 projectionAbort?.abort();projectionAbort=null;
 if(fictionSound){
  try{fictionSound.source.stop();}catch{}
  try{Promise.resolve(fictionSound.context.close()).catch(()=>{});}catch{}
  fictionSound=null;
 }
 if(clear){
  acceptedFiction=null;by('fiction-project-btn').disabled=true;
  by('fiction-door').textContent='Fictional door: closed (not physical)';
  by('fiction-render').textContent='Nothing rendered.';
 }
}
async function playLocalGlass(score){
 const API=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(typeof API!=='function')return false;
 const context=new API();let source=null;
 try{
  const buffer=context.createBuffer(1,score.samples.length,score.sampleRate);
  buffer.copyToChannel(score.samples,0);
  source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
  fictionSound={context,source};
  source.onended=()=>{if(fictionSound?.source===source){fictionSound=null;Promise.resolve(context.close()).catch(()=>{});}};
  const resume=context.resume();source.start();await resume;
  return context.state==='running';
 }catch(error){
  try{source?.stop();}catch{}try{await context.close();}catch{}fictionSound=null;throw error;
 }
}

by('change').value=JSON.stringify(EXAMPLE_CHANGE,null,2);
function report(s,kind='info'){status.textContent=s;status.dataset.kind=kind;}
function show(v){receipt.textContent=JSON.stringify(v,null,2);detail.hidden=false;}
function fail(e){report('Refused: '+String(e?.message||e),'error');}
function invalid(){stopCue({clear:true});stagedFiction=null;proposalOnly=false;by('run-btn').disabled=Boolean(active);output.textContent='Not executed for this revision.';detail.hidden=true;report('Draft changed. Translate or run again.');}
source.addEventListener('input',invalid);
by('english-btn').addEventListener('click',()=>{try{english.value=wtlToEnglish(source.value,{compile:runtime.compile}).english;report('WTL read in structured British English; no model contacted.','good');}catch(e){fail(e);}});
by('from-english-btn').addEventListener('click',()=>{try{if(english.value.startsWith('Proposed ')){loadSemantic(translateSemantic({format:'change-en-GB',input:english.value}).glyphs);return;}source.value=englishToWtl(english.value,{compile:runtime.compile}).source;invalid();report('Structured English compiled to WTL; not executed.','good');}catch(e){fail(e);}});
by('runes-btn').addEventListener('click',()=>{try{runtime.compile(source.value);runes.value=wtlToGlyphTransport(source.value);report('Lossless rune encoding, not full semantic Skýrunor.','good');}catch(e){fail(e);}});
by('from-runes-btn').addEventListener('click',()=>{try{const w=glyphTransportToWtl(runes.value);runtime.compile(w);source.value=w;invalid();report('Runes decoded to WTL; no execution.','good');}catch(e){fail(e);}});
by('check-btn').addEventListener('click',()=>{try{const v=roundTripWtl(source.value,{compile:runtime.compile});output.textContent=JSON.stringify({equivalent:v.equivalent,source_hash:v.original_source_hash},null,2);report('English↔WTL typed IR round-trip verified.','good');}catch(e){fail(e);}});
function loadSemantic(glyphs) {
 if(active)throw new Error("Wait until the active programme finishes or use Feather.");
 const result=translateSemantic({format:'skyrunor',input:glyphs},{compile:runtime.compile});
 if(!result.source){proposalOnly=true;by('run-btn').disabled=true;by('change').value=JSON.stringify(result.ast,null,2);by('semantic').value=result.glyphs;english.value=result.english;show(result);report('Change proposal only. No domain executor; no change applied. Edit or load WTL to enable Run.');return;}
 source.value=result.source;english.value=result.english;
 by('semantic').value=result.glyphs;by('declaration').value=result.declaration||'';
 invalid();show(result);report('Semantic round trip verified. Translation grants no execution authority or physical verification. Tap Run to execute.','good');
}
by('declaration-btn').addEventListener('click',()=>{try{loadSemantic(astToGlyphs(englishToDeclaration(by('declaration').value)));}catch(e){fail(e);}});
by('from-semantic-btn').addEventListener('click',()=>{try{loadSemantic(by('semantic').value);}catch(e){fail(e);}});
by('semantic-btn').addEventListener('click',()=>{try{loadSemantic(translateSemantic({format:'wtl',input:source.value},{compile:runtime.compile}).glyphs);}catch(e){fail(e);}});
by('change-btn').addEventListener('click',()=>{try{loadSemantic(translateSemantic({format:'change',input:JSON.parse(by('change').value)}).glyphs);}catch(e){fail(e);}});
for(const id of ['fiction','fiction-world'])by(id).addEventListener('input',()=>{
 stopCue({clear:true});stagedFiction=null;
 by('fiction-preview').textContent='Draft changed. Compose again before Run.';
 report('Fiction draft changed. No stale approval remains.');
});
by('fiction-compose-btn').addEventListener('click',()=>{
 try{
  if(active)throw new Error('Cannot replace WTL during execution.');
  const built=fictionToWtl(by('fiction').value,{world:by('fiction-world').value,compile:runtime.compile});
  source.value=built.wtl;invalid();stagedFiction=built;
  by('fiction-preview').textContent=JSON.stringify({crossings:built.fiction.nodes.length,source_hash:built.fiction.source_hash,
   proposed_effects:built.fiction.nodes.filter(x=>x.effect_status==='proposal-only'),status:'compiled-not-executed'},null,2);
  report('Fiction composed into living Möbius WTL. Run is still your decision.','good');
 }catch(error){by('fiction-preview').textContent='Fiction refused: '+String(error?.message||error);fail(error);}
});
by('fiction-project-btn').addEventListener('click',async()=>{
 if(!acceptedFiction||active||projectionAbort)return;
 const current=acceptedFiction,controller=projectionAbort=new AbortController();
 by('fiction-project-btn').disabled=true;
 try{
  const rendered=await renderApprovedFiction(current,{confirmed:true,signal:controller.signal,
   playSound:playLocalGlass,
   projectWorld:state=>{
    if(controller.signal.aborted)return false;
    by('fiction-door').textContent='Fictional door: '+state.state+' (story only)';
    return true;
   }
  });
  if(controller.signal.aborted||current!==acceptedFiction)throw Error('Feather stopped the cue.');
  by('fiction-render').textContent=JSON.stringify(rendered,null,2);
  if(last?.fiction?.fiction_source_hash===current.fiction_source_hash&&last.source_hash===rendered.wtl_source_hash){
    last={...last,fiction_projection:rendered};
    try{localStorage.setItem(STORE,JSON.stringify(last));}catch{/* Offline storage may be unavailable. Export JSON instead. */}
  }
  report('Fictional cues rendered after separate approval. Local display Return saved where supported.','good');
 }catch(error){by('fiction-render').textContent='Projection held: '+String(error?.message||error);fail(error);}
 finally{if(projectionAbort===controller)projectionAbort=null;by('fiction-project-btn').disabled=!acceptedFiction;}
});
by('fiction-stop-btn').addEventListener('click',()=>{stopCue({clear:true});report('Feather held the sound and fictional projection.');});
by('run-btn').addEventListener('click',async()=>{
 if(active||proposalOnly)return;stopCue({clear:true});active=new AbortController();by('run-btn').disabled=true;report('Executing native Wyrdrune locally…');
 try{
  const executionSource=source.value,ir=runtime.compile(executionSource);
  let declaration=null;try{declaration=wtlToAst(executionSource,{compile:runtime.compile});}catch{}
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(active.signal.aborted)throw new Error('Feather held before execution.');
  const result=await runtime.execute(ir,{principal:{id:'ipad-local',authorized:false},bridges:{},maxOperations:5000,signal:active.signal});
  const fiction=stagedFiction&&executionSource===stagedFiction.wtl&&result.status==='committed'
   ?verifyFictionExecution(stagedFiction,result):null;
  if(fiction){
   acceptedFiction=fiction;
   const plan=planFictionProjection(fiction);
   by('fiction-project-btn').disabled=!plan.items.some(item=>item.kind!=='unsupported');
   by('fiction-render').textContent=JSON.stringify(plan,null,2);
  }
  const world_crossing=fiction?planPhysicalEmbodiment(fiction):null;
  const saved={schema:'wayglass.first-lantern-ipad/v1',world_crossing,source_hash:ir.sourceHash,status:result.status??'committed',output:result.output,completed_cycles:result.withness?.completedCycles,checkpoint_count:result.checkpoints?.length??0,carry:result.continuity?.carry??null,lineage_root:result.lineage?.root??null,recorded_at:new Date().toISOString(),external_effects:[],model_invoked:false,declaration,fiction,physically_verified:false};
  last=saved;output.textContent=JSON.stringify({status:saved.status,output:saved.output,cycles:saved.completed_cycles,carry:saved.carry,fiction:saved.fiction,world_crossing:saved.world_crossing},null,2);show(saved);
  if(saved.status==='committed'){try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{}report('First Lantern committed. Return recorded.','good');}
  else report('Execution returned '+saved.status+'. Check the receipt.','error');
 }catch(e){output.textContent=String(e?.message||e);fail(e);}
 finally{active=null;by('run-btn').disabled=proposalOnly;}
});
by('feather-btn').addEventListener('click',()=>{stopCue({clear:true});active?.abort();report(active?'Feather held: stopping at the next checked boundary.':'Feather held: no active execution.');});
by('restore-btn').addEventListener('click',()=>{
 try{
  const saved=JSON.parse(localStorage.getItem(STORE)||'null');
  if(!saved){report('No local Return receipt stored.');return;}
  if(saved.source_hash!==sha256Hex(source.value)){
   show(saved);report('Different source revision. The old receipt remains available but is not restored.','error');return;
  }
  stopCue({clear:true});last=saved;show(saved);
  if(saved.fiction&&saved.fiction_projection){
   const view=restoreFictionDisplay(saved.fiction,saved.fiction_projection);
   by('fiction-door').textContent='Fictional door: '+view.fictional_door+' (restored story view; not physical)';
   by('fiction-render').textContent=JSON.stringify(view,null,2);
   report('Source-bound local scene restored. WTL did not run and no audio was replayed.','good');
  }else report('Local Return receipt recovered with matching WTL source hash.','good');
 }catch(e){fail(e);}
});
by('save-btn').addEventListener('click',()=>{if(!last){report('Run or restore a receipt first.');return;}const blob=new Blob([JSON.stringify(last,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='First-Lantern-Return.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);report('Download the Return receipt to Files.','good');});
by('reset-btn').addEventListener('click',()=>{source.value=ORIGINAL;english.value='';runes.value='';by('semantic').value='';invalid();report('First Lantern reset. Saved local Return retained.','good');});
report('Ready. Native Wyrdrune on iPad, fully local.','good');
