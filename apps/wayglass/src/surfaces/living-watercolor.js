import { createWatercolorFluid } from '../watercolor-fluid.js';
import {
  watercolorSnapshot, watercolorProgram, publishWatercolorActivity,
  subscribeWatercolorActivity, proposeWatercolorTouch, configureWatercolorProgram,
} from '../watercolor-bridge.js';
import { WATERCOLOR_MODES, resolveWatercolorMode, inviteWatercolorMode,
  extractWatercolorProgramProposal } from '../watercolor-modes.js';
import { listWayglassRoutes } from '../route-client.js';
import { wayglassSomaticSound, SOUND_EVENTS, WAYGLASS_FEATHER_EVENT } from '../somatic-sound.js';
import {createWatercolorContinuity} from '../watercolor-continuity.js';
import { journeyLedger } from '../journey-before-destination.js';
import {synchronizeJourneyFeather} from './journey-before-destination.js';

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
    pendingProgram=null, animationId=0, requestEpoch=0;
  const soundState=wayglassSomaticSound.snapshot();
  synchronizeJourneyFeather({stopped:soundState.feather_stopped,confirmed:soundState.feather_release_confirmed});
  let featherStopped = journeyLedger.snapshot().feather_stopped || soundState.feather_stopped;
  paused=featherStopped;
  if(featherStopped&&!wayglassSomaticSound.snapshot().feather_stopped)wayglassSomaticSound.feather();
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
  root.innerHTML=[
    '<section class="wg-surface wc-surface" data-surface="living-watercolor">',
      '<header class="wg-surface-head glass-panel wc-head">',
        '<div><p class="eyebrow">Wayglass · Living Observer</p>',
        '<h1>The Living Watercolor</h1>',
        '<nav class="wc-room-links" aria-label="Wayglass rooms"><button type="button" class="glass-chip" data-wc-room="wayglass:acoustic-room">Acoustic Room</button><button type="button" class="glass-chip" data-wc-room="arcsweep:writing-room">Writing Room</button><button type="button" class="glass-chip" data-wc-room="wayglass:journey-before-destination">Journey</button></nav>',
        '<p class="lede">A place to meet, paint, speak, and choose what comes next together.</p></div>',
        '<div class="wc-head-signal"><span class="wc-status-light" aria-hidden="true"></span>',
        '<strong id="wc-link">Awaiting activity</strong>',
        '<span class="tiny" id="wc-evidence">No verified agent event received</span></div>',
      '</header>',
      '<div class="wc-composition">',
        '<div class="wc-stage glass-panel">',
          '<canvas id="wc-fluid" class="wc-fluid" aria-label="Interactive fluid watercolor painting; touch to add pigment" tabindex="0"></canvas>',
          '<div class="wc-stage-meta" aria-hidden="true">WAYGLASS / AQUARELLE / PREMAQC</div>',
          '<div class="wc-deck glass-panel" aria-label="Wayglass collaborative expression desk">',
            '<div class="wc-deck-header"><div><span class="eyebrow">Voice &amp; work surface</span>',
            '<h2 id="wc-title">Dream</h2></div><span class="wc-model-state" id="wc-route-state">Checking model routes</span></div>',
            '<div class="wc-modes" role="group" aria-label="Wayglass creative and engineering modes">',
              ...WATERCOLOR_MODES.map(modeButton),
            '</div>',
            '<p class="wc-mode-intent" id="wc-intent"></p>',
            '<div class="wc-voice" id="wc-voice" role="log" aria-live="polite" aria-label="Wayglass model contributions">',
              '<span class="wc-voice-empty">An open page. Paint, leave a thought, or invite Wayglass to begin.</span>',
            '</div>',
            '<label class="wc-input-label" for="wc-prompt">Your contribution · optional</label>',
            '<textarea id="wc-prompt" rows="2" maxlength="3500" placeholder="A question, a colour, a fragment, a possibility…"></textarea>',
            '<div class="wc-compose-actions">',
              '<select id="wc-route" aria-label="Wayglass model route"></select>',
              '<button id="wc-invite" type="button" class="send-jewel" disabled>Invite Wayglass</button>',
              '<button id="wc-first-contact" type="button" class="glass-chip" disabled>Invite a first hello</button>',
            '</div>',
            '<div class="wc-feedback tiny" id="wc-feedback" role="status">What would you like to try together?</div>',
            '<div class="wc-continuity-actions"><button type="button" class="glass-chip" id="wc-save-return">Save conversation</button><button type="button" class="glass-chip" id="wc-recover-return">Recover conversation</button></div>',
            '<details class="wc-voice-preferences"><summary>Participant’s own voice notes</summary><label for="wc-voice-notes">Their wording<textarea id="wc-voice-notes" rows="2" maxlength="1200"></textarea></label><label for="wc-voice-author">Authored by<input id="wc-voice-author" maxlength="120" type="text"></label></details>',
            '<details id="wc-unverified" hidden><summary>Unattributed response retained</summary><pre class="wc-unverified" id="wc-unverified-text"></pre></details>',
            '<div class="wc-program" id="wc-program" hidden>',
              '<p class="tiny">A visual direction was offered. Choose whether to use these rules for the canvas.</p>',
              '<button type="button" class="glass-chip" id="wc-program-apply">Use these visual rules</button>',
              '<button type="button" class="glass-chip" id="wc-program-dismiss">Keep current rules</button>',
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
          '<p class="tiny">Activity carries its source references. Your touch offers direction; the canvas remains open to change.</p>',
        '</aside>',
      '</div>',
    '</section>',
  ].join('');

  const cleanups=[];
  function listen(target,type,handler){target.addEventListener(type,handler);cleanups.push(()=>target.removeEventListener(type,handler));}
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
  const modeButtons=[...root.querySelectorAll('[data-wc-mode]')];
  const activeMode=()=>resolveWatercolorMode(mode);
  let session='wc-'+(globalThis.crypto?.randomUUID?.()||String(Date.now()));
  const continuity=createWatercolorContinuity({sessionId:session});
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
    if(stopped||featherStopped)return;
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
      empty.textContent='Room for '+selected.label.toLowerCase()+'. Invite Wayglass, or begin with your own thought.';
      voice.append(empty);
    }
    pendingProgram=null;
    q('wc-program').hidden=true;
  }
  modeButtons.forEach(button=>listen(button,'click',()=>activateMode(button.dataset.wcMode)));
  activateMode('dream');
  async function loadRoutes() {
    try{
      const catalogue=await listWayglassRoutes();
      if(stopped)return;
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
      invite.disabled=!routeId||featherStopped;
      q('wc-first-contact').disabled=!routeId||featherStopped;
      routeState.textContent=routeId?'Model route available · opt-in':'No model route available';
    }catch(error){
      if(stopped)return;
      routeId=null;route.replaceChildren();invite.disabled=true;q('wc-first-contact').disabled=true;
      routeState.textContent='Model route offline';
      feedback.textContent='Canvas works offline; model route requires connected Hearthgate.';
    }
  }
  listen(route,'change',()=>{routeId=route.value||null;});
  async function requestContribution(){
    if(stopped||busy||!routeId||featherStopped)return;
    const notes=q('wc-voice-notes').value.trim(),author=q('wc-voice-author').value.trim();
    if(notes&&!author){feedback.textContent='Add who authored the voice notes before sharing them.';q('wc-voice-author').focus();return;}
    busy=true;invite.disabled=true;q('wc-first-contact').disabled=true;
    const authorText=prompt.value.trim(),requestedMode=mode,requestedRoute=routeId,epoch=++requestEpoch;
    const request={mode:requestedMode,authorText,routeId:requestedRoute,sessionId:session};
    feedback.textContent='Inviting a '+activeMode().label.toLowerCase()+' contribution…';
    try{
      const response=await inviteWatercolorMode({
        ...request,activity:watercolorSnapshot().events,
        history:continuity.history(),checkpoint:continuity.snapshot().checkpoint,
        voicePreferences:notes?{text:notes,author}:null,
      });
      if(stopped||featherStopped||epoch!==requestEpoch)return;
      continuity.append({request,response});
      responses.set(requestedMode,response);
      if(mode===requestedMode)activateMode(requestedMode);
      feedback.textContent=response.provider+' / '+response.model+' · '+(response.receipt?.observation_id||response.receipt?.receipt_id||response.receipt?.request_id||'response received');
      q('wc-unverified').hidden=true;
      const proposed=extractWatercolorProgramProposal(response.text);pendingProgram=proposed;
      q('wc-program').hidden=!proposed;
    }catch(error){
      if(stopped||featherStopped||epoch!==requestEpoch)return;
      feedback.textContent='Contribution unavailable: '+error.message;
      if(error.raw_result){q('wc-unverified-text').textContent=JSON.stringify(error.raw_result,null,2);q('wc-unverified').hidden=false;}
    }finally{
      if(!stopped&&epoch===requestEpoch){busy=false;invite.disabled=!routeId||featherStopped;q('wc-first-contact').disabled=!routeId||featherStopped;}
    }
  }
  listen(invite,'click',requestContribution);
  listen(q('wc-first-contact'),'click',()=>{
    if(stopped||busy||!routeId||featherStopped)return;
    prompt.value='Wayglass, hello. What would you like to try here? You can choose a direction, suggest something of your own, or decline.';
    return requestContribution();
  });
  for(const button of root.querySelectorAll('[data-wc-room]'))listen(button,'click',()=>globalThis.__wayglassOS?.mount(button.dataset.wcRoom));
  listen(q('wc-save-return'),'click',()=>{
    try{const saved=continuity.saveLocal();feedback.textContent=saved.persisted?'Conversation saved in this browser.':'Conversation was not saved.';}
    catch(error){feedback.textContent='Save unavailable: '+error.message;}
  });
  listen(q('wc-recover-return'),'click',()=>{
    try{
      const restored=continuity.recoverLocal();session=restored.session_id;responses.clear();
      for(const turn of restored.turns)responses.set(turn.request.mode,turn.response);
      activateMode(mode);feedback.textContent='Conversation recovered · '+restored.turns.length+' contributions.';
    }catch(error){feedback.textContent='Recovery unavailable: '+error.message;}
  });
  listen(q('wc-program-apply'),'click',()=>{
    if(featherStopped){feedback.textContent='Release Feather before changing the visual rules.';return;}
    if(!pendingProgram)return;
    try{
      configureWatercolorProgram(pendingProgram.rules,{author:'reviewed-model-suggestion'});
      feedback.textContent='The offered visual rules are now shaping this canvas.';
      pendingProgram=null;q('wc-program').hidden=true;
    }catch(error){feedback.textContent='Visual rule rejected: '+error.message;}
  });
  listen(q('wc-program-dismiss'),'click',()=>{
    pendingProgram=null;q('wc-program').hidden=true;
    feedback.textContent='Current visual rules retained.';
  });
  listen(pressure,'input',()=>{
    q('wc-pressure-label').textContent=pressure.value+'%';
  });
  listen(q('wc-flow'),'click',()=>{
    if(featherStopped){feedback.textContent='Release Feather before restarting the fluid.';return;}
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
    invite.disabled=busy||!routeId||featherStopped;q('wc-first-contact').disabled=busy||!routeId||featherStopped;
    q('wc-flow').textContent=paused?'Fluid paused':'Fluid on';q('wc-flow').setAttribute('aria-pressed',String(!paused));q('wc-flow').classList.toggle('active',!paused);
  }
  listen(soundButton,'click',async()=>{
    if(featherStopped)return;
    try{
      const before=wayglassSomaticSound.snapshot();
      const state=await wayglassSomaticSound.enable({
        audio:!before.audio_enabled,haptics:before.haptics_enabled,
      });
      if(stopped)return;
      feedback.textContent=state.audio_enabled
        ?'Sound enabled by your choice. Spatial cues are synthesized at low volume.'
        :'Sound disabled or unavailable in this browser. Watercolor remains active.';
    }catch(error){if(stopped)return;feedback.textContent=error.message;}
    reflectSound();
  });
  hapticButton.disabled=typeof globalThis.navigator?.vibrate!=='function';
  listen(hapticButton,'click',async()=>{
    if(featherStopped)return;
    try{
      const before=wayglassSomaticSound.snapshot();
      const state=await wayglassSomaticSound.enable({
        audio:before.audio_enabled,haptics:!before.haptics_enabled,
      });
      if(stopped)return;
      feedback.textContent=state.haptics_enabled?'Haptics enabled by your choice.':'Haptics disabled.';
    }catch(error){if(stopped)return;feedback.textContent=error.message;}
    reflectSound();
  });
  listen(featherButton,'click',()=>{
    try {
      if(featherStopped){
        if(journeyLedger.snapshot().feather_stopped)journeyLedger.resume({confirmed:true});
        wayglassSomaticSound.releaseFeather({confirmed:true});
        featherStopped=false;
        feedback.textContent='Feather released by your explicit choice. Sound remains off.';
      }else{
        if(!journeyLedger.snapshot().feather_stopped)journeyLedger.supportFold('feather');
        wayglassSomaticSound.feather();
        featherStopped=true;paused=true;pointerId=null;lastPointer=null;requestEpoch++;busy=false;
        feedback.textContent='Feather Stop. Motion, sound, haptics and model invitations paused.';
      }
    } catch(error){feedback.textContent=error.message;}
    reflectSound();updateInspector();
  });
  reflectSound();
  listen(q('wc-clear-note'),'click',()=>{
    q('wc-note').focus();
    feedback.textContent='Write a new direction, then place it on the painting.';
  });
  listen(q('wc-suggest'),'click',()=>{
    if(featherStopped){feedback.textContent='Release Feather before placing a suggestion.';return;}
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
  listen(canvas,'pointerdown',event=>{
    if(featherStopped || (event.button!==0 && event.pointerType==='mouse'))return;
    pointerId=event.pointerId;lastPointer=null;
    canvas.setPointerCapture?.(pointerId);
    brush(event);event.preventDefault();
  });
  listen(canvas,'pointermove',event=>{
    if(stopped||featherStopped||pointerId!==event.pointerId)return;
    brush(event);event.preventDefault();
  });
  const endPointer=event=>{
    if(event.pointerId===pointerId){pointerId=null;lastPointer=null;}
  };
  listen(canvas,'pointerup',endPointer);
  listen(canvas,'pointercancel',endPointer);
  listen(canvas,'keydown',event=>{
    if(!featherStopped&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      const proposal=proposeWatercolorTouch({
        x:.5,y:.5,color:color.value,pressure:Number(pressure.value)/100,
      });
      fluid.inject({x:proposal.x,y:proposal.y,color:proposal.color,amount:proposal.pressure});
      paint();updateInspector();
    }
  });
  const onFeather=event=>{
    if(stopped||!event.detail||typeof event.detail.stopped!=='boolean')return;
    synchronizeJourneyFeather(event.detail);
    if(event.detail.stopped){
      featherStopped=true;paused=true;pointerId=null;lastPointer=null;requestEpoch++;busy=false;
    }else if(event.detail.confirmed===true){
      featherStopped=false;
    }
    reflectSound();updateInspector();
  };
  globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
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
      stopped=true;requestEpoch++;busy=false;pointerId=null;lastPointer=null;
      offActivity();
      for(const remove of cleanups.splice(0))remove();
      globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
      wayglassSomaticSound.stop();
      globalThis.cancelAnimationFrame?.(animationId);
      fluid.dispose();
    },
    fluid,
  };
}

