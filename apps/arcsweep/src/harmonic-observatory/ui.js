/** Wayglass Harmonic Observatory local UI. Import/export is scoped to explicit user selection. */
import {createSession,validateSession,copySession,compileArrangement} from './core.js';
import {HarmonicAudioEngine} from './live-engine.js';
import {HarmonicSoundfontRack} from './soundfont-rack.js';
import {KNOWN_BANKS} from './soundfont-contract.js';
const $=id=>document.getElementById(id);
const context=new HarmonicAudioEngine();
const soundfonts=new HarmonicSoundfontRack();
let session=createSession(),last=null,worker=null,requestNumber=0,meterTimer=null,playTimer=null;
const val=id=>$(id).value;
const number=id=>Number(val(id));
const status=(message)=>{$('status').textContent=message;};
const showError=(e)=>status(`Operation stopped: ${e.message||String(e)}`);
const voiceMarkup=(s,i)=>`<section class="voice" data-stem="${i}"><h3>Voice ${'ABC'[i]}</h3><label class="switch"><input type="checkbox" data-field="enabled" ${s.enabled?'checked':''}> Enabled</label><label>Semitones<input type="number" data-field="semitones" min="-24" max="24" step="1" value="${s.semitones}"></label><label>Gain<input type="range" data-field="gain" min="0" max="0.5" step="0.01" value="${s.gain}"></label><label>Pan<input type="range" data-field="pan" min="-1" max="1" step="0.05" value="${s.pan}"></label><label>Overtones<select data-field="overtones">${[1,2,3,4,5].map(x=>`<option value="${x}" ${s.overtones===x?'selected':''}>${x}</option>`).join('')}</select></label></section>`;
function voiceFields(){
  for(const node of $('voices').querySelectorAll('[data-stem]')){
    const stem=session.stems[Number(node.dataset.stem)];
    for(const input of node.querySelectorAll('[data-field]')){
      const key=input.dataset.field;
      stem[key]=input.type==='checkbox'?input.checked:Number(input.value);
    }
  }
}
function applyControls(){
  for(const [key,element] of Object.entries({mode:'mode',device_profile:'profile',root_hz:'root',difference_hz:'difference',duration_seconds:'duration',master_gain:'master'})){
    $(element).value=session[key];
  }
  $('session-id').value=session.session_id;
  $('stop-point').value=session.continuity.stop_point||'';
  $('next-owner').value=session.continuity.next_owner||'';
  $('questions').value=session.continuity.unresolved_questions.join('\n');
  $('voices').innerHTML=session.stems.map(voiceMarkup).join('');
}
function collect(){
  voiceFields();
  const next={...session,mode:val('mode'),device_profile:val('profile'),root_hz:number('root'),
    difference_hz:number('difference'),duration_seconds:number('duration'),master_gain:number('master'),
    session_id:val('session-id').trim(),
    continuity:{stop_point:val('stop-point').trim()||null,next_owner:val('next-owner').trim()||null,
      unresolved_questions:val('questions').split('\n').map(x=>x.trim()).filter(Boolean)},
  };
  validateSession(next);
  session=next;
  return copySession(next);
}
function createDownload(bytes,name,type){
  const blob=new Blob([bytes],{type});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function drawWave(preview){
  const canvas=$('wave'),ctx=canvas.getContext('2d');if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle='#071216';ctx.fillRect(0,0,w,h);
  const colours=['#67dada','#ad91ec'];
  preview.forEach((channel,ch)=>{
    const centre=(ch+0.5)*h/preview.length;
    ctx.strokeStyle=colours[ch];ctx.lineWidth=1.9;ctx.beginPath();
    for(let i=0;i<channel.length;i++){
      const x=i*(w-1)/(channel.length-1),y=centre-channel[i]*h/(preview.length*0.8);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  });
}
function renderWorker(sessionValue){
  worker??=new Worker(new URL('./render-worker.js',import.meta.url),{type:'module'});
  const id=++requestNumber;
  return new Promise((resolve,reject)=>{
    const handler=(e)=>{if(e.data?.id!==id)return;worker.removeEventListener('message',handler);
      e.data.ok?resolve(e.data):reject(new Error(e.data.error||'render failed'));};
    worker.addEventListener('message',handler);
    worker.postMessage({id,session:sessionValue});
  });
}
function metre(){
  const m=context.measureFrame();
  if(m){$('rms').style.width=`${Math.min(100,m.rms*400)}%`;
    $('peak').style.width=`${Math.min(100,m.sample_peak*300)}%`;}
  if(context.state==='auditioning')meterTimer=requestAnimationFrame(metre);
}
function clearTimers(){
  if(meterTimer!==null)cancelAnimationFrame(meterTimer);
  if(playTimer!==null)clearTimeout(playTimer);
  meterTimer=null;playTimer=null;
}
$('audition').addEventListener('click',async()=>{
  soundfonts.feather();renderSf2Presets();
  try{
    const recipe=collect();
    // RenderSamples validates the same arrangement/PCM as the offline path.
    compileArrangement(recipe);
    await context.audition(recipe);
    clearTimers();metre();
    playTimer=setTimeout(()=>{context.feather();clearTimers();status('Audition completed. Browser output has gone silent.');},(recipe.duration_seconds+0.25)*1000);
    status(`Auditioning ${recipe.mode} through browser default output · ${recipe.device_profile}.`);
  }catch(e){showError(e);}
});
$('feather').addEventListener('click',()=>{context.feather();clearTimers();status('Feather stop · silence requested and sources disconnected.');});
$('render').addEventListener('click',async()=>{
  try{
    const recipe=collect();$('render').disabled=true;status('Rendering deterministic PCM off the UI thread…');
    const data=await renderWorker(recipe);
    last={bytes:new Uint8Array(data.bytes),receipt:data.receipt};
    $('receipt').textContent=JSON.stringify(data.receipt,null,2);
    $('receipt-download').disabled=false;$('wav-download').disabled=false;
    drawWave(data.preview);
    const m=data.receipt.measurements;
    $('readout').textContent=`${data.receipt.format.channels} channel(s) · ${data.receipt.format.sample_rate_hz} Hz · RMS: ${m.rms.map(x=>x.toFixed(4)).join(' / ')} · peak: ${m.sample_peak.map(x=>x.toFixed(4)).join(' / ')} · stereo correlation: ${m.stereo_correlation??'n/a'} · spectral entropy: ${m.spectrum.map(x=>x.spectral_entropy?.toFixed(3)??'silent').join(' / ')}`;
    status('Offline WAV and provenance receipt ready. Download explicitly; nothing was played or uploaded.');
  }catch(e){showError(e);}finally{$('render').disabled=false;}
});
$('wav-download').addEventListener('click',()=>{if(last)createDownload(last.bytes,`${last.receipt.session_id}.wav`,'audio/wav');});
$('receipt-download').addEventListener('click',()=>{if(last)createDownload(JSON.stringify(last.receipt,null,2)+'\n',`${last.receipt.session_id}.receipt.json`,'application/json');});
$('save-recipe').addEventListener('click',()=>{try{const s=collect();createDownload(JSON.stringify(s,null,2)+'\n',`${s.session_id}.session.json`,'application/json');}catch(e){showError(e);}});
$('load-recipe').addEventListener('click',()=>$('recipe-file').click());
$('recipe-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>32768)throw new RangeError('recipe exceeds 32 KB');
    const imported=JSON.parse(await file.text());validateSession(imported);
    context.feather();soundfonts.feather();clearTimers();session=copySession(imported);last=null;applyControls();
    $('receipt').textContent='No receipt yet.';$('receipt-download').disabled=true;$('wav-download').disabled=true;
    status('Validated local recipe imported. Playback remains stopped.');
  }catch(error){showError(error);}finally{e.target.value='';}
});
$('session-reset').addEventListener('click',()=>{
  context.feather();soundfonts.feather();clearTimers();session=createSession();applyControls();last=null;
  $('receipt').textContent='No receipt yet.';$('receipt-download').disabled=true;$('wav-download').disabled=true;
  status('Session reset. Playback stopped; no previous file was changed.');
});
window.addEventListener('pagehide',()=>{clearTimers();void context.close();void soundfonts.close();worker?.terminate();worker=null;});
applyControls();


// SoundFont rack is a real attached ArcSweep organ. It uses the existing
// StorySoundscape/SpessaSynth runtime only after the steward loads a local bank.
const sfStatus = message => { $('sf2-status').textContent=message; };
function replaceOptions(select, items, placeholder){
  select.replaceChildren();
  if(!items.length){const o=document.createElement('option');o.value='';o.textContent=placeholder;select.append(o);return;}
  for(const item of items){const o=document.createElement('option');o.value=String(item.value);o.textContent=String(item.label);select.append(o);}
}
function renderBankList(){
  const snap=soundfonts.snapshot();
  const selection=$('sf2-bank').value;
  replaceOptions($('sf2-bank'),snap.files.map((f,i)=>({value:i,label:`${f.name} · ${(f.size/1048576).toFixed(1)} MiB`})),'Choose SoundFont files');
  if(snap.files.length){$('sf2-bank').value=(selection && Number(selection)<snap.files.length)?selection:'0';}
  $('sf2-bank').disabled=!snap.files.length;
  $('sf2-load').disabled=!snap.files.length || soundfonts.loading;
}
function renderSf2Presets(){
  const snap=soundfonts.snapshot();
  const names=snap.presets.filter(p=>!p.isDrum);
  for(let i=0;i<3;i++){
    const select=$(`sf2-voice-${i}`);
    replaceOptions(select,names.map(p=>({value:p.key,label:`${p.name} · ${p.bankMSB}/${p.bankLSB}/${p.program}`})),'No melodic programmes');
    select.disabled=!names.length;
    if(snap.selected_keys[i])select.value=snap.selected_keys[i];
  }
  const ready=snap.status==='ready'||snap.status==='auditioning';
  $('sf2-audition').disabled=!ready;
  $('sf2-blend').disabled=!ready;
  $('sf2-receipt').disabled=!snap.has_take;
}
function sf2Failure(error){sfStatus(`SoundFont stopped: ${error?.message||String(error)}`);}
$('sf2-known').replaceChildren(...KNOWN_BANKS.map(bank=>{
  const e=document.createElement('span');e.textContent=`${bank.name} · historically ${bank.historical_presets} presets`;return e;
}));
$('sf2-files').addEventListener('change',event=>{
  try{
    const added=soundfonts.addFiles(event.target.files);
    renderBankList();
    sfStatus(added.length?`${added.length} bank file(s) selected. Click Load chosen bank to parse the actual presets.`:'No new bank files selected.');
  }catch(error){sf2Failure(error);}finally{event.target.value='';}
});
$('sf2-load').addEventListener('click',async()=>{
  const index=Number($('sf2-bank').value);
  const button=$('sf2-load');button.disabled=true;
  try{
    sfStatus('Loading the selected local SoundFont into ArcSweep’s bundled AudioWorklet…');
    const state=await soundfonts.activateBank(index);
    sfStatus(`${state.bank.name} · ${state.bank.preset_count} actual presets loaded · SHA-256 verified · ready to audition.`);
  }catch(error){sf2Failure(error);}
  finally{renderBankList();renderSf2Presets();}
});
for(let i=0;i<3;i++)$('sf2-voice-'+i).addEventListener('change',event=>{
  try{soundfonts.choosePreset(i,event.target.value);sfStatus(`Voice ${'ABC'[i]} now has its own SF2 programme.`);}catch(error){sf2Failure(error);}
});
async function auditionSoundfonts({blend=false}={}){
  try{
    const recipe=collect();
    if(blend){
      // Both output contexts are started from this same explicit user action.
      await Promise.all([context.audition(recipe),soundfonts.audition(recipe)]);
      clearTimers();metre();
      playTimer=setTimeout(()=>{context.feather();soundfonts.feather();clearTimers();renderSf2Presets();sfStatus('Blended audition complete.');},(recipe.duration_seconds+0.25)*1000);
    }else{
      context.feather();clearTimers();await soundfonts.audition(recipe);
    }
    sfStatus(`${blend?'Blending live SoundFont voices and harmonics':'Auditioning three local SF2 instruments'} for ${recipe.duration_seconds}s via browser default audio. Audio is not uploaded.`);
    renderSf2Presets();
  }catch(error){context.feather();soundfonts.feather();clearTimers();sf2Failure(error);renderSf2Presets();}
}
$('sf2-audition').addEventListener('click',()=>void auditionSoundfonts());
$('sf2-blend').addEventListener('click',()=>void auditionSoundfonts({blend:true}));
$('sf2-feather').addEventListener('click',()=>{
  soundfonts.feather();context.feather();clearTimers();renderSf2Presets();
  sfStatus('Feather all · SoundFont MIDI and harmonic oscillators stopped.');status('Feather stop · all active experiment sources released.');
});
$('feather').addEventListener('click',()=>{soundfonts.feather();renderSf2Presets();sfStatus('Feather stop · all SF2 notes released.');});
$('sf2-receipt').addEventListener('click',()=>{
  if(soundfonts.lastTake)createDownload(JSON.stringify(soundfonts.lastTake,null,2)+'\n',`${soundfonts.lastTake.session_id}.sf2-take.json`,'application/json');
});
renderBankList();renderSf2Presets();