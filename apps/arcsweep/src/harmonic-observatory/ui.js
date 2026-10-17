/** Wayglass Harmonic Observatory local UI. Import/export is scoped to explicit user selection. */
import {createSession,validateSession,copySession,compileArrangement} from './core.js';
import {HarmonicAudioEngine} from './live-engine.js';
const $=id=>document.getElementById(id);
const context=new HarmonicAudioEngine();
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
    context.feather();clearTimers();session=copySession(imported);last=null;applyControls();
    $('receipt').textContent='No receipt yet.';$('receipt-download').disabled=true;$('wav-download').disabled=true;
    status('Validated local recipe imported. Playback remains stopped.');
  }catch(error){showError(error);}finally{e.target.value='';}
});
$('session-reset').addEventListener('click',()=>{
  context.feather();clearTimers();session=createSession();applyControls();last=null;
  $('receipt').textContent='No receipt yet.';$('receipt-download').disabled=true;$('wav-download').disabled=true;
  status('Session reset. Playback stopped; no previous file was changed.');
});
window.addEventListener('pagehide',()=>{clearTimers();void context.close();worker?.terminate();worker=null;});
applyControls();
document.querySelectorAll('.deck-chip,.rail-link').forEach(link=>link.addEventListener('click',()=>{
  const target=link.getAttribute('href');
  document.querySelectorAll('.deck-chip').forEach(item=>{
    const active=item.getAttribute('href')===target;
    item.classList.toggle('selected',active);
    if(active)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current');
  });
  document.querySelectorAll('.rail-link').forEach(item=>item.classList.toggle('current',item.getAttribute('href')===target));
}));
