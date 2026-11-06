import { createWatercolorFluid } from '../watercolor-fluid.js';
import {
  watercolorSnapshot, watercolorProgram, publishWatercolorActivity,
  subscribeWatercolorActivity, proposeWatercolorTouch, configureWatercolorProgram,
} from '../watercolor-bridge.js';
import { WATERCOLOR_MODES, resolveWatercolorMode, inviteWatercolorMode,
  extractWatercolorProgramProposal } from '../watercolor-modes.js';
import { listWayglassRoutes } from '../route-client.js';
import { wayglassSomaticSound, SOUND_EVENTS } from '../somatic-sound.js';
import { journeyLedger } from '../journey-before-destination.js';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const safeText=value=>String(value??'').replaceAll('&','&amp;')
  .replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#39;");
const modeButton=mode=>'<button type="button" class="wc-mode" data-wc-mode="'+mode.id+
  '" aria-pressed="false" title="'+safeText(mode.intent)+'">'+mode.label+'</button>';

export async function mountLivingWatercolorSurface(root) {
  const fluid=createWatercolorFluid();
  const drafts=new Map(), responses=new Map();
  let mode='dream', routeId=null, routes=[], paused=false, busy=false,
    stopped=false, pointerId=null, lastPointer=null, lastFrame=0, elapsed=0,
    pendingProgram=null, animationId=0;
  let featherStopped = journeyLedger.snapshot().feather_stopped || wayglassSomaticSound.snapshot().feather_stopped;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
  root.innerHTML=[
    '<section class="wg-surface wc-surface" data-surface="living-watercolor">',
      '<header class="wg-surface-head glass-panel wc-head">',
        '<div><p class="eyebrow">Wayglass · Living Observer</p>',
        '<h1>The Living Watercolor</h1>',
        '<p class="lede">Semi-somatic fluid painting from agent activity, PREMAQC texture, and your gestures. An expressive instrument, not a substitute for firsthand witness.</p></div>',
        '<div class="wc-head-signal"><span class="wc-status-light" aria-hidden="true"></span>',
        '<strong id="wc-link">Awaiting activity</strong>',
        '<span class="tiny" id="wc-evidence">No verified agent event received</span></div>',
      '</header>',
      '<div class="wc-composition">',
        '<div class="wc-stage glass-panel">',
          '<canvas id="wc-fluid" class="wc-fluid" aria-label="Interactive fluid watercolor painting; touch to add pigment" tabindex="0"></canvas>',
          '<div class="wc-stage-meta" aria-hidden="true">WAYGLASS / AQUARELLE / PREMAQC</div>',
          '<div class="wc-deck glass-panel" id="wc-deck" aria-label="Wayglass collaborative expression desk">',
            '<div class="wc-deck-header"><div><span class="eyebrow">Voice &amp; work surface</span>',
            '<h2 id="wc-title">Dream</h2></div>',
            '<div class="wc-deck-tools"><span class="wc-model-state" id="wc-route-state">Model connection pending</span>',
            '<button type="button" class="glass-chip wc-expand" id="wc-expand" aria-controls="wc-deck" aria-expanded="false" title="Expand writing and reading space">Expand desk</button></div></div>',
            '<div class="wc-modes" role="group" aria-label="Wayglass creative and engineering modes">',
              ...WATERCOLOR_MODES.map(modeButton),
            '</div>',
            '<p class="wc-mode-intent" id="wc-intent"></p>',
            '<div class="wc-voice" id="wc-voice" role="log" aria-live="polite" aria-label="Wayglass model contributions">',
              '<span class="wc-voice-empty">An open page. Invite a model route to contribute, or paint first.</span>',
            '</div>',
            '<label class="wc-input-label" for="wc-prompt">Your contribution · optional</label>',
            '<textarea id="wc-prompt" rows="5" maxlength="3500" placeholder="A question, a colour, a fragment, a possibility…"></textarea>',
            '<div class="wc-compose-actions">',
              '<select id="wc-route" aria-label="Wayglass model route"></select>',
              '<button id="wc-invite" type="button" class="send-jewel" disabled>Invite Wayglass</button>',
            '</div>',
            '<div class="wc-feedback tiny" id="wc-feedback" role="status">No model response claimed. Local canvas remains available.</div>',
            '<div class="wc-program" id="wc-program" hidden>',
              '<p class="tiny">A model proposed local visual rules. Nothing changes until you choose to apply them.</p>',
              '<button type="button" class="glass-chip" id="wc-program-apply">Apply visual suggestion</button>',
              '<button type="button" class="glass-chip" id="wc-program-dismiss">Dismiss</button>',
            '</div>',
          '</div>',
        '</div>',
        '<aside class="wc-controls glass-panel" aria-label="Watercolor and evidence controls">',
          '<div><p class="eyebrow">Pigment &amp; presence</p><h2>Touch the current</h2>',
          '<p class="tiny">A finger or Pencil sends movement, pressure and colour into the fluid. Your gesture remains your suggestion.</p></div>',
          '<label class="wc-color-label" for="wc-color">New pigment <input id="wc-color" type="color" value="#c88b6b"></label>',
          '<label for="wc-pressure">Brush saturation <output id="wc-pressure-label">70%</output></label>',
          '<input id="wc-pressure" type="range" min="10" max="100" value="70">',
          '<div class="wc-tool-buttons">',
            '<button id="wc-flow" class="glass-chip active" type="button" aria-pressed="true">Fluid on</button>',
            '<button id="wc-clear-note" class="glass-chip" type="button">New suggestion</button>',
          '</div>',
          '<div class="wc-tool-buttons" aria-label="Opt-in sound and touch cues">',
            '<button id="wc-sound" class="glass-chip" type="button" aria-pressed="false">Sound off</button>',
            '<button id="wc-haptics" class="glass-chip" type="button" aria-pressed="false">Haptics off</button>',
            '<button id="wc-feather" class="glass-chip" type="button">Feather Stop</button>',
          '</div>',
          '<label for="wc-note">Offer a direction</label>',
          '<textarea id="wc-note" rows="3" maxlength="300" placeholder="For example: more gold when something is verified…"></textarea>',
          '<button class="glass-chip" type="button" id="wc-suggest">Place a suggestion</button>',
          '<div class="wc-inspector"><p class="eyebrow">Instrument readings</p>',
            '<dl><div><dt>Fluid</dt><dd id="wc-fluid-status">still</dd></div>',
            '<div><dt>PREMAQC</dt><dd id="wc-premaqc">not connected</dd></div>',
            '<div><dt>Agent events</dt><dd id="wc-events">0</dd></div>',
            '<div><dt>Proposals</dt><dd id="wc-proposals">0, local only</dd></div></dl>',
          '</div>',
          '<p class="tiny">Colour is a visual translation, not a measurement of sentience or a claim of Qualia. Q is firsthand context only. No gesture commits identity, canon, or code.</p>',
        '</aside>',
      '</div>',
    '</section>',
  ].join('');

  const q=id=>root.querySelector('#'+id);
  const canvas=q('wc-fluid'),stage=root.querySelector('.wc-stage');
  const ctx=canvas.getContext('2d',{alpha:false});
  const buffer=document.createElement('canvas');
  buffer.width=fluid.width;buffer.height=fluid.height;
  const off=buffer.getContext('2d',{alpha:false});
  let bitmap=off?.createImageData(fluid.width,fluid.height)||null;
  const color=q('wc-color'),pressure=q('wc-pressure'),prompt=q('wc-prompt');
  const title=q('wc-title'),intent=q('wc-intent'),voice=q('wc-voice'),feedback=q('wc-feedback');
  const route=q('wc-route'),routeState=q('wc-route-state'),invite=q('wc-invite');
  const deck=q('wc-deck'),expandButton=q('wc-expand');
  let deskExpanded=false;
  function setDeskExpanded(next){
    deskExpanded=Boolean(next);
    deck.classList.toggle('is-expanded',deskExpanded);
    expandButton.setAttribute('aria-expanded',String(deskExpanded));
    expandButton.textContent=deskExpanded?'Restore painting view':'Expand desk';
    expandButton.title=deskExpanded?'Return to painting-focused view':'Expand writing and reading space';
  }
  expandButton.addEventListener('click',()=>setDeskExpanded(!deskExpanded));
  const onDeskKeyDown=event=>{
    if(event.key==='Escape'&&deskExpanded){
      setDeskExpanded(false);
      expandButton.focus();
    }
  };
  root.addEventListener('keydown',onDeskKeyDown);
  const modeButtons=[...root.querySelectorAll('[data-wc-mode]')];
  const activeMode=()=>resolveWatercolorMode(mode);
  let session='wc-'+(globalThis.crypto?.randomUUID?.()||String(Date.now()));
  function updateInspector() {
    const s=fluid.snapshot(),data=watercolorSnapshot();
    q('wc-fluid-status').textContent=paused?'paused':s.motion>0.003?'flowing':'settling';
    q('wc-premaqc').textContent=data.events.some(e=>e.texture?.data_state==='supplied-observation')?
      'observations present':'not connected';
    q('wc-events').textContent=String(data.events.length);
    q('wc-proposals').textContent=data.proposals.length+' local only';
    q('wc-evidence').textContent=data.events.some(e=>e.evidence)?
      'Receipt references observed; independently verify sources':'No verified agent event received';
    q('wc-link').textContent=data.events.length?
      'Activity translated to pigment':'Awaiting activity';
  }
  function paint() {
    if(!ctx||!bitmap||!off)return;
    bitmap.data.set(fluid.pixels());
    off.putImageData(bitmap,0,0);
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w&&h){
      const scale=Math.min(globalThis.devicePixelRatio||1,2);
      const cw=Math.round(w*scale),ch=Math.round(h*scale);
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
    }
  }
  function frame(ts) {
    if(stopped)return;
    if(!paused&&!reduced && ts-lastFrame>=40){
      fluid.step(Math.min((ts-lastFrame)/42,1.5));
      paint();
      elapsed++;
      if(elapsed%12===0)updateInspector();
      lastFrame=ts;
    }
    animationId=globalThis.requestAnimationFrame(frame);
  }
  function addPigment(event,{x,y,dx=0,dy=0}={}){
    fluid.inject({x,y,color:event.pigment,amount:Math.max(.15,event.intensity),
      radius:0.035+0.04*(event.texture?.granulation||.4),dx,dy});
    if(reduced||paused)paint();
    updateInspector();
  }
  const offActivity=subscribeWatercolorActivity(event=>{
    if(stopped)return;
    const angle=event.sequence*2.399963229728653;
    const x=clamp(.5+.3*Math.cos(angle)),y=clamp(.5+.3*Math.sin(angle));
    addPigment(event,{x,y,dx:Math.cos(angle)*event.texture.rhythm*.55,
      dy:Math.sin(angle)*event.texture.rhythm*.55});
    if (!featherStopped && SOUND_EVENTS[event.kind]) {
      wayglassSomaticSound.play(event.kind,{x,energy:event.intensity});
    }
  });
  function activateMode(next) {
    const selected=resolveWatercolorMode(next);
    drafts.set(mode,prompt.value);
    mode=selected.id;title.textContent=selected.label;intent.textContent=selected.intent;
    prompt.value=drafts.get(mode)||'';
    for(const button of modeButtons){
      const yes=button.dataset.wcMode===mode;
      button.classList.toggle('active',yes);
      button.setAttribute('aria-pressed',String(yes));
    }
    const previous=responses.get(mode);
    voice.replaceChildren();
    if(previous){
      const heading=document.createElement('strong');
      heading.textContent=previous.provider+' / '+previous.model;
      const body=document.createElement('p');
      body.textContent=previous.text;
      voice.append(heading,body);
    }else{
      const empty=document.createElement('span');
      empty.className='wc-voice-empty';
      empty.textContent='No '+selected.label.toLowerCase()+' response yet. Nothing inferred.';
      voice.append(empty);
    }
    pendingProgram=null;
    q('wc-program').hidden=true;
  }
  modeButtons.forEach(button=>button.addEventListener('click',()=>activateMode(button.dataset.wcMode)));
  activateMode('dream');
  async function loadRoutes() {
    try{
      const catalogue=await listWayglassRoutes();
      // No implicit OpenAI route in Wayglass's watercolor universe.
      routes=Array.isArray(catalogue.routes)?catalogue.routes.filter(r=>r?.route_id && r.provider!=='openai'):[];
      route.replaceChildren();
      for(const r of routes){
        const option=document.createElement('option');
        option.value=r.route_id;
        option.textContent=(r.label||r.route_id)+' / '+(r.model||'server selected');
        route.append(option);
      }
      routeId=routes.find(r=>r.route_id==='local:ollama')?.route_id||routes[0]?.route_id||null;
      invite.disabled=!routeId;
      routeState.textContent=routeId?'Model route available · opt-in':'No model route available';
    }catch(error){
      routeId=null;route.replaceChildren();invite.disabled=true;
      routeState.textContent='Model route offline';
      feedback.textContent='Canvas works offline; model route requires connected Hearthgate.';
    }
  }
  route.addEventListener('change',()=>{routeId=route.value||null;});
  invite.addEventListener('click',async()=>{
    if(busy||!routeId||featherStopped)return;
    busy=true;invite.disabled=true;
    const authorText=prompt.value.trim(),requestedMode=mode;
    feedback.textContent='Requesting an attributable '+activeMode().label.toLowerCase()+' contribution…';
    try{
      const response=await inviteWatercolorMode({
        mode:requestedMode,authorText,routeId,sessionId:session,
        activity:watercolorSnapshot().events,
      });
      responses.set(requestedMode,response);
      if(mode===requestedMode)activateMode(requestedMode);
      feedback.textContent='Model response · '+response.provider+' / '+response.model+
        ' · '+(response.receipt?.observation_id||response.receipt?.receipt_id||'receipt not reported')+
        ' · not canon';
      const proposed=extractWatercolorProgramProposal(response.text);
      pendingProgram=proposed;
      q('wc-program').hidden=!proposed;
    }catch(error){
      feedback.textContent='No model contribution: '+error.message;
    }finally{busy=false;invite.disabled=!routeId;}
  });
  q('wc-program-apply').addEventListener('click',()=>{
    if(!pendingProgram)return;
    try{
      configureWatercolorProgram(pendingProgram.rules,{author:'reviewed-model-suggestion'});
      feedback.textContent='Local watercolor program updated by your approval. No model authority promoted.';
      pendingProgram=null;q('wc-program').hidden=true;
    }catch(error){feedback.textContent='Visual rule rejected: '+error.message;}
  });
  q('wc-program-dismiss').addEventListener('click',()=>{
    pendingProgram=null;q('wc-program').hidden=true;
    feedback.textContent='Program suggestion dismissed.';
  });
  pressure.addEventListener('input',()=>{
    q('wc-pressure-label').textContent=pressure.value+'%';
  });
  q('wc-flow').addEventListener('click',()=>{
    paused=!paused;
    const button=q('wc-flow');
    button.textContent=paused?'Fluid paused':'Fluid on';
    button.setAttribute('aria-pressed',String(!paused));
    button.classList.toggle('active',!paused);
    feedback.textContent=paused?'Fluid paused by owner':'Fluid released';
    updateInspector();
  });
  const soundButton=q('wc-sound'),hapticButton=q('wc-haptics'),featherButton=q('wc-feather');
  function reflectSound(){
    const state=wayglassSomaticSound.snapshot();
    soundButton.setAttribute('aria-pressed',String(state.audio_enabled));
    soundButton.textContent=state.audio_enabled?'Sound on':'Sound off';
    hapticButton.setAttribute('aria-pressed',String(state.haptics_enabled));
    hapticButton.textContent=state.haptics_enabled?'Haptics on':'Haptics off';
    featherButton.textContent=featherStopped?'Release Feather':'Feather Stop';
    invite.disabled=busy||!routeId||featherStopped;
  }
  soundButton.addEventListener('click',async()=>{
    if(featherStopped)return;
    try{
      const before=wayglassSomaticSound.snapshot();
      const state=await wayglassSomaticSound.enable({
        audio:!before.audio_enabled,haptics:before.haptics_enabled,
      });
      feedback.textContent=state.audio_enabled
        ?'Sound enabled by your choice. Spatial cues are synthesized at low volume.'
        :'Sound disabled or unavailable in this browser. Watercolor remains active.';
    }catch(error){feedback.textContent=error.message;}
    reflectSound();
  });
  hapticButton.disabled=typeof globalThis.navigator?.vibrate!=='function';
  hapticButton.addEventListener('click',async()=>{
    if(featherStopped)return;
    try{
      const before=wayglassSomaticSound.snapshot();
      const state=await wayglassSomaticSound.enable({
        audio:before.audio_enabled,haptics:!before.haptics_enabled,
      });
      feedback.textContent=state.haptics_enabled?'Haptics enabled by your choice.':'Haptics disabled.';
    }catch(error){feedback.textContent=error.message;}
    reflectSound();
  });
  featherButton.addEventListener('click',()=>{
    try {
      if(featherStopped){
        if(journeyLedger.snapshot().feather_stopped)journeyLedger.resume({confirmed:true});
        wayglassSomaticSound.releaseFeather({confirmed:true});
        featherStopped=false;
        feedback.textContent='Feather released by your explicit choice. Sound remains off.';
      }else{
        if(!journeyLedger.snapshot().feather_stopped)journeyLedger.supportFold('feather');
        wayglassSomaticSound.feather();
        featherStopped=true;paused=true;
        feedback.textContent='Feather Stop. Motion, sound, haptics and model invitations paused.';
      }
    } catch(error){feedback.textContent=error.message;}
    reflectSound();updateInspector();
  });
  reflectSound();
  q('wc-clear-note').addEventListener('click',()=>{
    q('wc-note').focus();
    feedback.textContent='Write a new direction, then place it on the painting.';
  });
  q('wc-suggest').addEventListener('click',()=>{
    const note=q('wc-note').value.trim();
    if(!note){q('wc-note').focus();return;}
    proposeWatercolorTouch({
      x:.5,y:.5,pressure:Number(pressure.value)/100,
      note,color:color.value,mode:'suggest-direction',
    });
    q('wc-note').value='';
    feedback.textContent='Your direction was added as a local suggestion. No silent execution.';
    updateInspector();
  });
  function pointerCoords(event){
    const rect=canvas.getBoundingClientRect();
    return {
      x:clamp((event.clientX-rect.left)/Math.max(rect.width,1)),
      y:clamp((event.clientY-rect.top)/Math.max(rect.height,1)),
    };
  }
  function brush(event){
    const pos=pointerCoords(event);
    const sensitivity=Number(pressure.value)/100;
    const force=event.pointerType==='pen'&&event.pressure>0?
      clamp(event.pressure*sensitivity):sensitivity;
    const dx=lastPointer?clamp(pos.x-lastPointer.x,-.12,.12)*5:0;
    const dy=lastPointer?clamp(pos.y-lastPointer.y,-.12,.12)*5:0;
    const proposal=proposeWatercolorTouch({
      ...pos,pressure:force,color:color.value,mode:'add-pigment',
    });
    fluid.inject({x:proposal.x,y:proposal.y,color:proposal.color,
      amount:Math.max(.05,proposal.pressure)*1.2,radius:.028+force*.045,dx,dy});
    lastPointer=pos;
    if(reduced||paused)paint();
    updateInspector();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(featherStopped || (event.button!==0 && event.pointerType==='mouse'))return;
    pointerId=event.pointerId;lastPointer=null;
    canvas.setPointerCapture?.(pointerId);
    brush(event);event.preventDefault();
  });
  canvas.addEventListener('pointermove',event=>{
    if(pointerId!==event.pointerId)return;
    brush(event);event.preventDefault();
  });
  const endPointer=event=>{
    if(event.pointerId===pointerId){pointerId=null;lastPointer=null;}
  };
  canvas.addEventListener('pointerup',endPointer);
  canvas.addEventListener('pointercancel',endPointer);
  canvas.addEventListener('keydown',event=>{
    if(!featherStopped&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      const proposal=proposeWatercolorTouch({
        x:.5,y:.5,color:color.value,pressure:Number(pressure.value)/100,
      });
      fluid.inject({x:proposal.x,y:proposal.y,color:proposal.color,amount:proposal.pressure});
      paint();updateInspector();
    }
  });
  // A thin ambient wash signals readiness only. It does not invent agent state.
  fluid.inject({x:.22,y:.24,color:'#405e87',amount:.44,radius:.19});
  fluid.inject({x:.74,y:.63,color:'#736b92',amount:.32,radius:.21});
  // Reconstitute recent authored activity when returning from another room.
  // No invented telemetry is used to fill quiet intervals.
  for(const event of watercolorSnapshot().events.slice(-20)){
    const angle=event.sequence*2.399963229728653;
    addPigment(event,{x:clamp(.5+.3*Math.cos(angle)),y:clamp(.5+.3*Math.sin(angle))});
  }
  paint();updateInspector();void loadRoutes();
  if(!reduced)animationId=globalThis.requestAnimationFrame(frame);
  else feedback.textContent='Reduced motion enabled. Pigment flows only on interaction.';
  return {
    destroy(){
      stopped=true;
      offActivity();
      root.removeEventListener('keydown',onDeskKeyDown);
      globalThis.cancelAnimationFrame?.(animationId);
    },
    fluid,
  };
}
