// Offline First Lantern: the existing canonical Wyrdrune parser/executor in Safari.
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {sha256Hex,canonicalDigest} from '../../../lib/wyrdrune/browser-canonical.mjs';
import {wtlToEnglish,englishToWtl,wtlToGlyphTransport,glyphTransportToWtl,roundTripWtl} from '../../../lib/wyrdrune/bidirectional.mjs';
const runtime=createWyrdruneRuntime({hashSource:sha256Hex,continuityDigest:canonicalDigest});
const by=id=>document.getElementById(id),source=by('wtl'),english=by('english'),runes=by('runes');
const status=by('status'),output=by('output'),receipt=by('receipt'),detail=by('details');
const ORIGINAL=source.value,STORE='wayglass:first-lantern:local-return/v1';
let active=null,last=null;
function report(s,kind='info'){status.textContent=s;status.dataset.kind=kind;}
function show(v){receipt.textContent=JSON.stringify(v,null,2);detail.hidden=false;}
function fail(e){report('Refused: '+String(e?.message||e),'error');}
function invalid(){output.textContent='Not executed for this revision.';detail.hidden=true;report('Draft changed. Translate or run again.');}
source.addEventListener('input',invalid);
by('english-btn').addEventListener('click',()=>{try{english.value=wtlToEnglish(source.value,{compile:runtime.compile}).english;report('WTL read in structured British English; no model contacted.','good');}catch(e){fail(e);}});
by('from-english-btn').addEventListener('click',()=>{try{source.value=englishToWtl(english.value,{compile:runtime.compile}).source;invalid();report('Structured English compiled to WTL; not executed.','good');}catch(e){fail(e);}});
by('runes-btn').addEventListener('click',()=>{try{runtime.compile(source.value);runes.value=wtlToGlyphTransport(source.value);report('Lossless rune encoding, not full semantic Skýrunor.','good');}catch(e){fail(e);}});
by('from-runes-btn').addEventListener('click',()=>{try{const w=glyphTransportToWtl(runes.value);runtime.compile(w);source.value=w;invalid();report('Runes decoded to WTL; no execution.','good');}catch(e){fail(e);}});
by('check-btn').addEventListener('click',()=>{try{const v=roundTripWtl(source.value,{compile:runtime.compile});output.textContent=JSON.stringify({equivalent:v.equivalent,source_hash:v.original_source_hash},null,2);report('English↔WTL typed IR round-trip verified.','good');}catch(e){fail(e);}});
by('run-btn').addEventListener('click',async()=>{
 if(active)return;active=new AbortController();by('run-btn').disabled=true;report('Executing native Wyrdrune locally…');
 try{
  const ir=runtime.compile(source.value);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(active.signal.aborted)throw new Error('Feather held before execution.');
  const result=await runtime.execute(ir,{principal:{id:'ipad-local',authorized:false},bridges:{},maxOperations:5000,signal:active.signal});
  const saved={schema:'wayglass.first-lantern-ipad/v1',source_hash:ir.sourceHash,status:result.status??'committed',output:result.output,completed_cycles:result.withness?.completedCycles,checkpoint_count:result.checkpoints?.length??0,carry:result.continuity?.carry??null,lineage_root:result.lineage?.root??null,recorded_at:new Date().toISOString(),external_effects:[],model_invoked:false};
  last=saved;output.textContent=JSON.stringify({status:saved.status,output:saved.output,cycles:saved.completed_cycles,carry:saved.carry},null,2);show(saved);
  if(saved.status==='committed'){try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{}report('First Lantern committed. Return recorded.','good');}
  else report('Execution returned '+saved.status+'. Check the receipt.','error');
 }catch(e){output.textContent=String(e?.message||e);fail(e);}
 finally{active=null;by('run-btn').disabled=false;}
});
by('feather-btn').addEventListener('click',()=>{active?.abort();report(active?'Feather held: stopping at the next checked boundary.':'Feather held: no active execution.');});
by('restore-btn').addEventListener('click',()=>{try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(!saved){report('No local Return receipt stored.');return;}if(saved.source_hash!==sha256Hex(source.value)){show(saved);report('Different source revision: old receipt preserved, not silently restored.','error');return;}last=saved;show(saved);report('Return receipt recovered from local storage.','good');}catch(e){fail(e);}});
by('save-btn').addEventListener('click',()=>{if(!last){report('Run or restore a receipt first.');return;}const blob=new Blob([JSON.stringify(last,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='First-Lantern-Return.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);report('Download the Return receipt to Files.','good');});
by('reset-btn').addEventListener('click',()=>{source.value=ORIGINAL;english.value='';runes.value='';invalid();report('First Lantern reset. Saved local Return retained.','good');});
report('Ready. Native Wyrdrune on iPad, fully local.','good');
