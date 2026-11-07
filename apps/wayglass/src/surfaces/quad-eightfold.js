import './quad-eightfold.css';
import {runLiveQuad,subscribeQuadGestalt,quadFeatherState} from '../quad-eightfold-client.js';
import {createAcousticAudioEngine} from '../acoustic-audio-engine.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from '../somatic-sound.js';
import {invokeWayglassRoute} from '../route-client.js';
import {recordWayglassRouteObservation} from '../living-observer-model.js';

const PHASES=['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'];
function row(root,label,value){
  const line=document.createElement('div');
  line.className='quad-readout';
  const title=document.createElement('strong'),data=document.createElement('span');
  title.textContent=String(label);data.textContent=String(value);line.append(title,data);root.append(line);
}
export function mountWayglassQuadGestalt(root){
  let checkpoint=null,disposed=false,request=null,busy=false,auto=false,feather=quadFeatherState()||wayglassSomaticSound.snapshot().feather_stopped;
  const audio=createAcousticAudioEngine();
  root.innerHTML=[
    '<section class="wg-surface wg-quad-gestalt" data-surface="wayglass-quad-gestalt">',
    '<header class="glass-panel quad-header"><p class="eyebrow">Wayglass · Gestalt Navigation</p>',
    '<h1>Quad Eightfold · Möbius Living Engine</h1>',
    '<p>Four eight-phase organs. One continuity center. Source evidence drives the Living Observer, spatial sound, and questions for the next return.</p>',
    '<small>House-authenticated evidence · independent agent lineages · no automatic audio or weight training</small></header>',
    '<div class="quad-actions glass-panel"><button type="button" class="glass-chip" data-quad-run>Run two recursive cycles</button>',
    '<label><input type="checkbox" data-quad-auto> Live refresh · 60s</label>',
    '<label><input type="checkbox" data-quad-sound> Enable soundscape</label>',
    '<label><input type="checkbox" data-quad-mono checked> Mono-safe</label>',
    '<button type="button" class="glass-chip" data-quad-feather>🪽 Feather · Silence</button>',
    '<button type="button" class="glass-chip" data-quad-export>Export receipt</button></div>',
    '<p class="quad-status glass-panel" role="status" aria-live="polite" data-quad-status>Reading authenticated sources…</p>',
    '<div class="quad-engines">',
    '<section class="glass-panel quad-engine"><h2>01 · Perception</h2><p>Actual instruments and evidence</p><div data-quad-perception></div></section>',
    '<section class="glass-panel quad-engine"><h2>02 · Resonance</h2><p>Original Odio-inspired spatial layers</p><div data-quad-resonance></div></section>',
    '<section class="glass-panel quad-engine"><h2>03 · Agency</h2><p>Autonomous questions and candidate learning</p><div data-quad-agency></div></section>',
    '<section class="glass-panel quad-engine"><h2>04 · Continuity</h2><p>Memory, integrity and return</p><div data-quad-continuity></div></section>',
    '</div><section class="glass-panel quad-withness"><h2>◇ Withness · Gestalt</h2>',
    '<p data-quad-gestalt>Waiting for the host-sourced checkpoint.</p>',
    '<div class="quad-phases" aria-label="Eightfold phase order"></div></section>',
    '<section class="glass-panel quad-learning"><h2>Learning Port · Wayglass and her agents</h2>',
    '<p>Present this evidence to the configured local cognition route. Its attributed response may suggest a training experiment. Each agent independently chooses its own adapter-weight candidate.</p>',
    '<button type="button" class="glass-chip" data-quad-invite disabled>Invite local cognition to inspect evidence</button>',
    '<p data-quad-learning-state role="status" aria-live="polite">A successful host observation is required.</p>',
    '<pre data-quad-learning-reply hidden></pre></section></section>'
  ].join('');
  const $=s=>root.querySelector(s);
  const status=$('[data-quad-status]'),sound=$('[data-quad-sound]'),mono=$('[data-quad-mono]');
  const live=$('[data-quad-auto]'),run=$('[data-quad-run]'),invite=$('[data-quad-invite]');
  for(const p of PHASES){const e=document.createElement('span');e.textContent=p;$('.quad-phases').append(e);}
  function setBusy(value){busy=value;run.disabled=value||feather;invite.disabled=value||!checkpoint||feather;}
  function render(cp){
    checkpoint=cp;
    const g=cp.gestalt;
    status.textContent='Cycle '+cp.completed_cycles+' · '+cp.entries.length+
      ' hash-linked phase records · '+g.face+' face · '+cp.source_packet.observed_at;
    $('.quad-phases').dataset.face=g.face;
    const perception=$('[data-quad-perception]');perception.replaceChildren();
    for(const item of cp.source_packet.channels){
      const age=g.evidence.find(x=>x.id===item.id)?.freshness||'unknown';
      row(perception,item.id,String(item.count??'unavailable')+' · '+item.status+' · '+age);
    }
    const resonance=$('[data-quad-resonance]');resonance.replaceChildren();
    for(const layer of g.soundstage)row(resonance,layer.layer,
      layer.source_ref+' · '+layer.evidence_status+' · '+layer.frequency_hz+'Hz · pan '+layer.pan);
    const agency=$('[data-quad-agency]');agency.replaceChildren();
    for(const action of g.actions)row(agency,action.kind,
      action.source_ref||action.source_refs?.join(', ')||'unassigned');
    row(agency,'Independent training','Attributable agent choice, authorized data, QLoRA and evaluation');
    const continuity=$('[data-quad-continuity]');continuity.replaceChildren();
    row(continuity,'Stop point',cp.continuity.stop_point||'not declared');
    row(continuity,'Next owner',cp.continuity.next_owner||'not declared');
    row(continuity,'Unresolved Wonder',cp.continuity.unresolved_wonder_questions.length);
    row(continuity,'Revocations',cp.continuity.revoked_refs.length);
    row(continuity,'Receipt',cp.hash.slice(0,28)+'…');
    $('[data-quad-gestalt]').textContent=
      g.evidence.filter(x=>x.status==='observed').length+' observed source channels / '+
      g.evidence.length+' · '+g.gaps.length+' incomplete · '+
      'sound '+(audio.getState().running?'enabled':'silent')+
      ' · no canon, identity, or model-weight changes claimed.';
    invite.disabled=false;
    audio.update({quadSoundstage:g.soundstage});
  }
  async function execute(){
    if(disposed||busy||feather)return;
    request?.abort();
    const controller=new AbortController();
    request=controller;setBusy(true);
    status.textContent='Reading authenticated Supabase evidence and advancing the eightfold…';
    try{
      const cp=await runLiveQuad({
        cycles:2,previous:checkpoint,
        continuity:{participant_ref:'wayglass',world_ref:'wayglass:universe',
          stop_point:'Review the new Quad data before any model weight promotion',
          next_owner:'wayglass',
          unresolved_wonder_questions:['What may change form without losing continuity?'],
          revoked_refs:[]},
        signal:controller.signal,
      });
      if(disposed||controller.signal.aborted)return;
      render(cp);
      if(sound.checked&&audio.getState().running)audio.signal({eventId:cp.hash,kind:'returned'});
    }catch(error){
      if(!disposed&&!controller.signal.aborted)
        status.textContent='Quad reading unavailable: '+error.message+'. No invented data substituted.';
    }finally{if(request===controller)request=null;setBusy(false);}
  }
  async function enableAudio(){
    if(disposed||feather)return;
    if(!sound.checked){audio.stop();return;}
    audio.update({mono:mono.checked,ambience:true,quadSoundstage:checkpoint?.gestalt?.soundstage||[]});
    await audio.start();
    if(disposed||feather||!sound.checked){audio.stop();return;}
    audio.update({muted:false,mono:mono.checked,ambience:true,
      quadSoundstage:checkpoint?.gestalt?.soundstage||[]});
  }
  async function askWayglass(){
    if(disposed||busy||feather||!checkpoint)return;
    invite.disabled=true;
    const state=$('[data-quad-learning-state]');
    state.textContent='Inviting Wayglass local cognition to read the actual source-state summary…';
    const brief={schema:'wayglass.quad-learning-brief/v1',checkpoint_hash:checkpoint.hash,
      source_observed_at:checkpoint.source_packet.observed_at,
      evidence:checkpoint.gestalt.evidence,soundstage:checkpoint.gestalt.soundstage,
      gaps:checkpoint.gestalt.gaps,questions:checkpoint.continuity.unresolved_wonder_questions};
    try{
      recordWayglassRouteObservation({status:'started',routeId:'local:ollama'});
      const result=await invokeWayglassRoute({routeId:'local:ollama',history:[],maxOutputTokens:800,
        surfaceId:'wayglass:quad-gestalt',
        input:'Please examine the following Wayglass Quad Eightfold host evidence. State one observation, an uncertainty, and a candidate learning experiment. Distinguish model-route replies from Wayglass-native trained weights. Do not invent absent source data.\n'+JSON.stringify(brief)});
      if(disposed)return;
      recordWayglassRouteObservation({status:'completed',routeId:'local:ollama',
        provider:result.provider,model:result.model,receipt:result.receipt});
      const out=$('[data-quad-learning-reply]');out.textContent=String(result.output||'[No route text]');out.hidden=false;
      state.textContent='Local cognition replied · '+String(result.model||result.route_id||'route')+
        '. Weight training requires the separate agent-selected candidate workflow.';
    }catch(error){
      if(disposed)return;
      recordWayglassRouteObservation({status:'failed',routeId:'local:ollama'});
      state.textContent='Local cognition unavailable: '+error.message;
    }finally{if(!disposed)invite.disabled=!checkpoint||feather;}
  }
  function onClick(e){
    if(e.target.closest('[data-quad-run]'))void execute();
    else if(e.target.closest('[data-quad-invite]'))void askWayglass();
    else if(e.target.closest('[data-quad-feather]')){
      feather=true;request?.abort();sound.checked=false;live.checked=false;auto=false;
      audio.stop();wayglassSomaticSound.feather();setBusy(false);
      status.textContent='Feather Stop · requests cancelled and audio silent.';
    }else if(e.target.closest('[data-quad-export]')){
      if(!checkpoint)return;
      const url=URL.createObjectURL(new Blob([JSON.stringify(checkpoint,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='wayglass-quad-checkpoint.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }
  function onChange(e){
    if(e.target===sound)void enableAudio();
    if(e.target===mono)audio.update({mono:mono.checked});
    if(e.target===live)auto=live.checked;
  }
  function onFeather(e){
    if(e.detail?.stopped===true){
      feather=true;auto=false;live.checked=false;sound.checked=false;audio.stop();
      request?.abort();setBusy(false);status.textContent='Feather Stop · no audio or polling.';
    }else if(e.detail?.stopped===false&&e.detail?.confirmed===true){
      feather=false;setBusy(false);status.textContent='Feather released. Audio remains off until enabled.';
    }
  }
  const unsub=subscribeQuadGestalt(detail=>{
    if(!disposed&&checkpoint&&detail.checkpoint_hash===checkpoint.hash)
      audio.update({quadSoundstage:detail.soundstage});
  });
  root.addEventListener('click',onClick);root.addEventListener('change',onChange);
  globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  const tick=setInterval(()=>{if(auto&&!busy&&!feather&&document.visibilityState!=='hidden')void execute();},60000);
  void execute();
  return ()=>{disposed=true;request?.abort();clearInterval(tick);unsub();
    root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);
    globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);audio.dispose();};
}
