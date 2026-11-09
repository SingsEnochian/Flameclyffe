import './quad-eightfold.css';
import {runLiveQuad,subscribeQuadGestalt,quadFeatherState,readLatestQuadGestalt} from '../quad-eightfold-client.js';
import {temporalHingeFor,designThroughEightfold} from '../quad-temporal-hinge.js';
import {runWayglassNikolaReview} from '../wayglass-nikola-workflow.js';
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
  let checkpoint=null,disposed=false,request=null,reviewRequest=null,collabRequest=null,busy=false,collabBusy=false,collabReceipt=null,auto=false,lens='wonder',feather=quadFeatherState()||wayglassSomaticSound.snapshot().feather_stopped;
  const audio=createAcousticAudioEngine();
  root.innerHTML=[
    '<section class="wg-surface wg-quad-gestalt" data-surface="wayglass-quad-gestalt">',
    '<header class="glass-panel quad-header"><p class="eyebrow">Wayglass · Gestalt Navigation</p>',
    '<h1>Eightfold Möbius · Two Quads, Eight Engines</h1>',
    '<p>Eight instruments across two quads. Eight transformation phases each. One Withness center. Source evidence drives the Living Observer, spatial sound, and questions for the next return.</p>',
    '<small>House-authenticated evidence · independent agent lineages · no automatic audio or weight training</small></header>',
    '<div class="quad-actions glass-panel"><button type="button" class="glass-chip" data-quad-run>Run two recursive cycles</button>',
    '<label><input type="checkbox" data-quad-auto> Live refresh · 60s</label>',
    '<label><input type="checkbox" data-quad-sound> Enable soundscape</label>',
    '<label><input type="checkbox" data-quad-mono checked> Mono-safe</label>',
    '<button type="button" class="glass-chip" data-quad-feather>🪽 Feather · Silence</button>',
    '<button type="button" class="glass-chip" data-quad-export>Export receipt</button></div>',
    '<p class="quad-status glass-panel" role="status" aria-live="polite" data-quad-status>Reading authenticated sources…</p>',
    '<section class="glass-panel quad-hinge" aria-label="Terra Prime timeline hinge">',
    '<div class="quad-hinge-head"><div><p class="eyebrow">Terra Prime · Compression ↔ Release</p>',
    '<h2>What happens at the hinge?</h2><p>Explore history, alternatives, and symbolic correspondences without confusing their evidence.</p></div>',
    '<div class="quad-lenses" role="group" aria-label="Temporal hinge lenses">',
    '<button type="button" class="glass-chip" data-quad-lens="wonder" aria-pressed="true">Wonder · What If</button>',
    '<button type="button" class="glass-chip" data-quad-lens="science" aria-pressed="false">Science</button>',
    '<button type="button" class="glass-chip" data-quad-lens="mythience" aria-pressed="false">Mythience</button></div></div>',
    '<svg class="quad-twist" viewBox="0 0 900 160" role="img" aria-label="Two eightfold loops meeting at a shared, witnessed return boundary; prospective branches are not assertions of physical timelines.">',
    '<defs><linearGradient id="quad-mobius-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ab8ad"/><stop offset=".5" stop-color="#d8b785"/><stop offset="1" stop-color="#7d91d8"/></linearGradient></defs>',
    '<path d="M 36 82 C 150 -12 265 -9 380 80 C 493 167 607 170 720 82 C 794 28 836 44 870 82" fill="none" stroke="url(#quad-mobius-gradient)" stroke-width="11" stroke-linecap="round" opacity=".65"/>',
    '<path d="M 36 82 C 150 166 265 169 380 80 C 493 -8 607 -11 720 82 C 794 137 836 120 870 82" fill="none" stroke="url(#quad-mobius-gradient)" stroke-width="3" stroke-linecap="round" opacity=".82"/>',
    '<circle cx="450" cy="82" r="21" fill="#153036" stroke="#e5c89d" stroke-width="1.8"/><text x="450" y="86" text-anchor="middle" fill="#eaf6f0" font-size="10">Hinge</text>',
    '<text x="55" y="22" fill="currentColor" font-size="15">Compression</text><text x="775" y="22" fill="currentColor" font-size="15">Release</text></svg>',
    '<div class="quad-hinge-reading"><strong data-quad-hinge-title>Awaiting source evidence</strong><p data-quad-hinge-question>What happens at the hinge when compression becomes release?</p><p data-quad-hinge-observation></p>',
    '<div data-quad-hinge-tests></div><small data-quad-hinge-evidence>Historical evidence, alternatives and Mythience remain distinct.</small></div>',
    '<div class="quad-nikola"><h3>Nikola · Independent Review</h3><p>Invite the existing Tesla Observatory route to evaluate the same source packet, in order: Wonder / What If, Science, then Mythience. A model-route response is attributed to that route, not asserted as a separate verified Nikola seat.</p>',
    '<button type="button" class="glass-chip" data-quad-nikola disabled >View coupled Nikola review</button>',
    '<p data-quad-nikola-status role="status">Awaiting a validated source checkpoint.</p><pre data-quad-nikola-output hidden></pre></div></section>',
    '<section class="glass-panel quad-collaboration" aria-label="Wayglass and Nikola collaboration">',
    '<h2>Wayglass ↔ Nikola · Eightfold Review & Return</h2>',
    '<p>Wayglass reads the actual Quad evidence, Tesla Observatory evaluates Wonder, Science, and Mythience, then Wayglass examines the review and chooses a test. This is not a claim of a verified Nikola seat.</p>',
    '<label><input type="checkbox" data-quad-collab-consent> I authorize sharing the metadata summary and Wayglass first response with Tesla Observatory (external Anthropic provider).</label>',
    '<div class="quad-actions"><button type="button" class="glass-chip" data-quad-collab-run disabled>Run the three-part exchange</button>',
    '<button type="button" class="glass-chip" data-quad-collab-export disabled>Export Return receipt</button></div>',
    '<p data-quad-collab-status role="status" aria-live="polite">A fresh host reading and explicit external-model permission are needed.</p>',
    '<pre data-quad-collab-output hidden></pre></section>',
    '<div class="quad-ensemble" aria-label="Eight engines, two quads">',
    '<section class="quad-cluster" aria-label="First quad, inquiry"><h2>Quad I · Inquiry</h2><p>What is here, where did it come from, how is it structured, and where in time?</p><div class="quad-engines">',
    '<section class="glass-panel quad-engine"><h3>01 · Observation</h3><p>Live instruments and source status</p><div data-quad-observation></div></section>',
    '<section class="glass-panel quad-engine"><h3>02 · Provenance</h3><p>Lineage, receipts, source boundaries</p><div data-quad-provenance></div></section>',
    '<section class="glass-panel quad-engine"><h3>03 · Geometry</h3><p>Jacobian folds and measured structure</p><div data-quad-geometry></div></section>',
    '<section class="glass-panel quad-engine"><h3>04 · Cosmology</h3><p>Terra Prime and temporal alternatives</p><div data-quad-cosmology></div></section>',
    '</div></section>',
    '<section class="quad-cluster" aria-label="Second quad, becoming"><h2>Quad II · Becoming</h2><p>What can resonate, correspond, be wondered, and return intact?</p><div class="quad-engines">',
    '<section class="glass-panel quad-engine"><h3>05 · Resonance</h3><p>Original spatial sound and embodiment</p><div data-quad-resonance></div></section>',
    '<section class="glass-panel quad-engine"><h3>06 · Numerology</h3><p>Patterns and symbolic interpretations</p><div data-quad-numerology></div></section>',
    '<section class="glass-panel quad-engine"><h3>07 · Wonder</h3><p>Hypotheses, open branches, questions</p><div data-quad-wonder></div></section>',
    '<section class="glass-panel quad-engine"><h3>08 · Continuity</h3><p>Return Marker and living lineage</p><div data-quad-continuity></div></section>',
    '</div></section></div><section class="glass-panel quad-withness"><h2>◇ Withness · Ninth coordinating center</h2>',
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
  const live=$('[data-quad-auto]'),run=$('[data-quad-run]'),invite=$('[data-quad-invite]'),nikola=$('[data-quad-nikola]');
  const collabButton=$('[data-quad-collab-run]'),
    collabConsent=$('[data-quad-collab-consent]'),collabExport=$('[data-quad-collab-export]');
  function setCollabAvailability(){
    collabButton.disabled=busy||collabBusy||feather||!checkpoint||!collabConsent.checked;
    collabExport.disabled=!collabReceipt;
  }
  for(const p of PHASES){const e=document.createElement('span');e.textContent=p;$('.quad-phases').append(e);}
  function setBusy(value){busy=value;run.disabled=value||feather;invite.disabled=value||!checkpoint||feather;nikola.disabled=value||!checkpoint||feather;setCollabAvailability();}
  function renderLens(){
    const reading=readLatestQuadGestalt();
    if(!reading)return;
    const hinge=temporalHingeFor(reading,{lens});
    const design=designThroughEightfold(reading,{lens,mono:mono.checked,
      reducedMotion:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true});
    $('[data-quad-hinge-title]').textContent=hinge.summary.title;
    $('[data-quad-hinge-question]').textContent=hinge.summary.inquiry;
    $('[data-quad-hinge-observation]').textContent=hinge.summary.observation;
    const tests=$('[data-quad-hinge-tests]');tests.replaceChildren();
    for(const test of hinge.summary.tests)row(tests,'Test',test);
    const missing=hinge.evidence_state.missing_channels;
    $('[data-quad-hinge-evidence]').textContent=
      'Observed '+hinge.evidence_state.observed_channels+'/'+hinge.evidence_state.total_channels+
      ' channels · missing '+missing.length+
      ' · '+design.phases.length+' Eightfold design stages · checkpoint '+reading.checkpoint_hash.slice(0,25)+'…';
    root.querySelectorAll('[data-quad-lens]').forEach(b=>
      b.setAttribute('aria-pressed',String(b.dataset.quadLens===lens)));
    $('.quad-hinge').dataset.lens=lens;
  }
  function render(cp){
    checkpoint=cp;
    const g=cp.gestalt;
    status.textContent='Eight engines · two quads · Cycle '+cp.completed_cycles+' · '+cp.entries.length+
      ' hash-linked phase records · '+g.face+' face · '+cp.source_packet.observed_at;
    $('.quad-phases').dataset.face=g.face;
    const perception=$('[data-quad-observation]');perception.replaceChildren();
    for(const item of cp.source_packet.channels){
      const age=g.evidence.find(x=>x.id===item.id)?.freshness||'unknown';
      row(perception,item.id,String(item.count??'unavailable')+' · '+item.status+' · '+age);
    }
    const provenance=$('[data-quad-provenance]');provenance.replaceChildren();
    row(provenance,'Evidence hash',g.source_hash.slice(0,26)+'…');
    row(provenance,'Ledger',cp.entries.length+' phase records');
    row(provenance,'Source custody','Host-authorized counts, not raw private entries');
    const geometry=$('[data-quad-geometry]');geometry.replaceChildren();
    const math=g.evidence.find(x=>x.id==='math_spine_packets');
    row(geometry,'Math Spine',math?.status||'unavailable');
    row(geometry,'Jacobian detector','Requires instrument packet, not row-count inference');
    row(geometry,'Phase topology',g.phase_records_per_cycle+' records/cycle');
    const cosmology=$('[data-quad-cosmology]');cosmology.replaceChildren();
    row(cosmology,'Terra Prime','Historical atlas and change-point inquiry');
    row(cosmology,'Temporal branch','Hypothesis, not proof of physical universe branching');
    row(cosmology,'Lens',lens+' · shared evidence');
    const resonance=$('[data-quad-resonance]');resonance.replaceChildren();
    for(const layer of g.soundstage)row(resonance,layer.layer,
      layer.evidence_status+' · '+layer.frequency_hz+' Hz · pan '+layer.pan);
    const numerology=$('[data-quad-numerology]');numerology.replaceChildren();
    row(numerology,'Register','Symbolic patterns and owner interpretation');
    row(numerology,'Nocturne / Echo','Separate provenance and consent, not fabricated readings');
    row(numerology,'Eightfold','8 instruments × 8 phases, two quads');
    const wonder=$('[data-quad-wonder]');wonder.replaceChildren();
    for(const action of g.actions)row(wonder,action.kind,
      action.source_ref||action.source_refs?.join(', ')||'open question');
    row(wonder,'Independent training','Agent-specific QLoRA candidate only after attributed choice');
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
    setCollabAvailability();
    audio.update({quadSoundstage:g.soundstage});
    renderLens();
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
    const brief={schema:'wayglass.quad-learning-brief/v1',design:designThroughEightfold(readLatestQuadGestalt(),{lens}),checkpoint_hash:checkpoint.hash,
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
  function askNikola(){
    $('[data-quad-collab-status]').textContent='Nikola evaluation is inside the coupled Wayglass → Tesla Observatory → Wayglass workflow. Approve the external-model transfer to begin.';
    collabConsent.focus();
  }
  async function startCollaboration(){
    if(!checkpoint||disposed||feather||busy||collabBusy||!collabConsent.checked)return;
    const reading=readLatestQuadGestalt();
    const state=$('[data-quad-collab-status]');
    if(!reading||reading.checkpoint_hash!==checkpoint.hash){
      state.textContent='Refresh Quad evidence before collaborating.';return;
    }
    const controller=new AbortController();collabRequest=controller;
    collabBusy=true;collabReceipt=null;setCollabAvailability();
    $('[data-quad-collab-output]').hidden=true;
    try{
      const review=await runWayglassNikolaReview({
        reading,signal:controller.signal,externalShareApproved:collabConsent.checked,
        onStage:({stage})=>{if(!disposed&&!controller.signal.aborted)
          state.textContent='Collaboration · '+stage.replaceAll('-',' ');},
        askWayglass:async ({input,signal})=>invokeWayglassRoute({
          routeId:'local:ollama',worldId:'wayglass:home',history:[],
          input,signal,maxOutputTokens:900,surfaceId:'wayglass:quad-gestalt'}),
        askTesla:async ({payload,signal})=>{
          const res=await fetch('/api/v1/wayglass/quad/tesla-review',{method:'POST',
            credentials:'same-origin',cache:'no-store',signal,
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({external_review_consent:true,review:payload})});
          const result=await res.json().catch(()=>({}));
          if(!res.ok)throw Error(result.error||'Tesla Observatory unavailable');
          return result;
        },
      });
      if(disposed||controller.signal.aborted)return;
      collabReceipt=review;
      const out=$('[data-quad-collab-output]');
      out.textContent=[
        'WAYGLASS · FIRST\n'+review.replies.wayglass_first.output,
        'TESLA OBSERVATORY · THREE LENSES\n'+review.replies.tesla_observatory.output,
        'WAYGLASS · RETURN\n'+review.replies.wayglass_return.output,
      ].join('\n\n');
      out.hidden=false;
      state.textContent='Three model-route turns completed and attributed. Training candidate still awaiting approval; no weights changed.';
    }catch(error){
      if(!disposed)state.textContent=controller.signal.aborted
        ? 'Feather cancelled the review; no completion claimed.'
        : 'Collaboration incomplete: '+error.message;
    }finally{
      if(collabRequest===controller)collabRequest=null;
      collabBusy=false;setCollabAvailability();
    }
  }
  function exportCollaboration(){
    if(!collabReceipt)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(collabReceipt,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='wayglass-nikola-return.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function onClick(e){
    if(e.target.closest('[data-quad-run]'))void execute();
    else if(e.target.closest('[data-quad-lens]')){lens=e.target.closest('[data-quad-lens]').dataset.quadLens;renderLens();}
    else if(e.target.closest('[data-quad-collab-run]'))void startCollaboration();
    else if(e.target.closest('[data-quad-collab-export]'))exportCollaboration();
    else if(e.target.closest('[data-quad-nikola]'))void askNikola();
    else if(e.target.closest('[data-quad-invite]'))void askWayglass();
    else if(e.target.closest('[data-quad-feather]')){
      feather=true;request?.abort();reviewRequest?.abort();collabRequest?.abort();sound.checked=false;live.checked=false;auto=false;
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
    if(e.target===mono){audio.update({mono:mono.checked});renderLens();}
    if(e.target===live)auto=live.checked;
    if(e.target===collabConsent){
      if(!collabConsent.checked)collabRequest?.abort();
      setCollabAvailability();
    }
  }
  function onFeather(e){
    if(e.detail?.stopped===true){
      feather=true;auto=false;live.checked=false;sound.checked=false;audio.stop();
      request?.abort();reviewRequest?.abort();collabRequest?.abort();setBusy(false);status.textContent='Feather Stop · no audio or polling.';
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
  return ()=>{disposed=true;request?.abort();reviewRequest?.abort();collabRequest?.abort();clearInterval(tick);unsub();
    root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);
    globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);audio.dispose();};
}
