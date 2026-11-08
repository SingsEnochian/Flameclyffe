import { scoreWyrdruneSpectrum } from './route-client.js';
import { createAcousticAudioEngine } from './acoustic-audio-engine.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { subscribeWatercolorActivity } from './watercolor-bridge.js';
import { wayglassSomaticSound, WAYGLASS_FEATHER_EVENT } from './somatic-sound.js';

export const SPECTRAL_FIELD_SCHEMA='wayglass.full-spectrum-client/v0.1';
const clamp=(value,fallback=.5)=>typeof value==='number'&&Number.isFinite(value)
  ?Math.max(0,Math.min(1,value)):fallback;
const allowedKinds=new Set(['gesture','writing','choice','route','world','return','feather','presence','observer','system']);

/**
 * One instrument across the entire OS, not another Writing Room app.
 * Browser event metadata is queued locally only after a deliberate opt-in.
 * All frequencies and gains originate in the authenticated Wyrdrune runtime.
 */
export function createWayglassSpectralField({
  scope=globalThis, document=scope.document,
  score=scoreWyrdruneSpectrum,
  audioFactory=createAcousticAudioEngine,
  observerSubscribe=subscribeWayglassObserver,
  watercolorSubscribe=subscribeWatercolorActivity,
  featherState=()=>wayglassSomaticSound.snapshot(),
}={}) {
  const listeners=new Set(), history=[];
  let active=false,disposed=false,heard=false,haptics=false,error=null,sequence=0,affinity=.5;
  let queue=[],pending=null,abort=null,timer=null,unsubscribeObserver=null,unsubscribeWatercolor=null,lastFrame=null;
  const audio=audioFactory();
  const status=()=>Object.freeze({
    schema:SPECTRAL_FIELD_SCHEMA,active,heard,haptics,disposed,error,affinity,
    pending:queue.length,processing:Boolean(pending),captured:sequence,
    last:history.at(-1)||null,history:Object.freeze([...history]),
    virtual_bands:['infrasonic','ultrasonic'],
    physical_inaudible_output:false,
  });
  function notify(){const s=status();for(const listener of [...listeners]){try{listener(s)}catch{}}}
  function listenFrame(frame) {
    if (!heard || !frame?.audible)return;
    const audible=frame.audible;
    audio.update({
      muted:false,mono:true,ambience:true,
      score:{
        rootHz:audible.voice_one_hz,counterpartHz:audible.voice_two_hz,
        foregroundGain:audible.foreground_gain,atmosphereGain:audible.atmosphere_gain,
      },
    });
  }
  function capture({kind='system',strength=.5,motion=.2,continuity=.5,intent=.5,phase=null,relationship=null,source_ref='wayglass:ui-events'}={}) {
    if(!active||disposed)return false;
    if(!allowedKinds.has(kind))throw new TypeError('Unrecognised Wayglass interaction.');
    // Event semantics only, never raw key codes, prose, DOM values or participant IDs.
    const event=Object.freeze({
      event_id:'ui-'+(++sequence),kind,strength:clamp(strength),
      motion:clamp(motion),continuity:clamp(continuity),intent:clamp(intent),
      affinity:relationship===null?affinity:clamp(relationship),phase:phase===null?((sequence%8)/8):clamp(phase),
      source_ref,
    });
    if(queue.length>=256){error='Spectral event queue capacity reached. Input was not silently marked as scored.';notify();return false}
    queue.push(event);schedule();notify();return true;
  }
  function schedule(){
    if(timer!==null||pending||!active||disposed)return;
    timer=scope.setTimeout(()=>{timer=null;void flush()},1400);
  }
  async function flush() {
    if(!active||disposed||pending||!queue.length)return status();
    if(timer!==null){scope.clearTimeout(timer);timer=null}
    const events=queue.splice(0,24);
    const controller=typeof AbortController==='function'?new AbortController():null;
    abort=controller;
    const call=Promise.resolve().then(()=>score(events,undefined,controller?.signal));
    pending=call;notify();
    try{
      const result=await call;
      if(!active||disposed||controller?.signal.aborted)return status();
      if(result?.schema!=='wayglass.full-spectrum/v0.1' ||
          result?.count!==events.length || !Array.isArray(result.events) ||
          result.events.length!==events.length)throw new Error('Wyrdrune returned an incomplete spectral batch.');
      for(let i=0;i<events.length;i++){
        if(result.events[i]?.event_id!==events[i].event_id ||
          result.events[i]?.phases?.length!==16 ||
          result.events[i]?.spectrum?.ultrasonic?.physical_playback!==false ||
          result.events[i]?.spectrum?.infrasonic?.physical_playback!==false) {
          throw new Error('Spectral source or inaudible-output contract mismatch.');
        }
      }
      error=null;
      for(const event of result.events) {
        const record=Object.freeze({event_id:event.event_id,kind:event.kind,source_ref:event.source_ref,
          spectrum:event.spectrum,source_hash:event.source_hash});
        history.push(record);
        if(history.length>64)history.shift();
        lastFrame=record.spectrum;
      }
      listenFrame(lastFrame);
      if(haptics && typeof scope.navigator?.vibrate==='function') {
        try{scope.navigator.vibrate(Math.round(lastFrame.projection.tactile_ms));}catch{}
      }
    }catch(e){
      if(!disposed && active && e?.name!=='AbortError'){
        error='Spectral scoring halted: '+(e?.message||'host unavailable');
        // Fail closed: do not silently fall back to JavaScript-composed tones.
        active=false;queue=[];stopHearing();
        removeCaptureListeners();
      }
    }finally{
      if(pending===call)pending=null;
      if(abort===controller)abort=null;
      if(active&&queue.length)schedule();
      notify();
    }
    return status();
  }
  function fromMaterial(event){
    const d=event?.detail||{};
    capture({kind:d.mode==='handoff'?'return':'system',
      strength:clamp(d.strength,.6),motion:clamp(d.handoff_progress,.2),
      continuity:clamp(d.ownership,.5),intent:clamp(d.intent,.5),
      source_ref:'wayglass:material-signal'});
  }
  function fromInput(event){
    if(event?.target?.type==='password')return;
    capture({kind:'writing',strength:.4,motion:.2,continuity:.7,intent:.65,
      source_ref:'wayglass:interaction-input'});
  }
  function fromChoice(event){
    if(event?.target?.type==='password')return;
    capture({kind:'choice',strength:.65,motion:.35,continuity:.55,intent:.8,
      source_ref:'wayglass:interaction-choice'});
  }
  function fromPointer(event){
    // Pointer coordinates contribute only a normalized motion scalar.
    const x=Number(event?.clientX),width=Number(scope.innerWidth);
    const motion=Number.isFinite(x)&&Number.isFinite(width)&&width>0?clamp(x/width):.4;
    capture({kind:'gesture',strength:.6,motion,intent:.6,
      source_ref:'wayglass:interaction-pointer'});
  }
  function fromKeys(event){
    if(event?.target?.type==='password')return;
    // Printable text is represented by the input event, never key content.
    if(event?.key?.length===1 || event?.isComposing)return;
    capture({kind:'gesture',strength:.3,motion:.25,continuity:.65,
      source_ref:'wayglass:interaction-navigation'});
  }
  function fromScroll(){
    capture({kind:'gesture',strength:.2,motion:.6,continuity:.55,
      source_ref:'wayglass:interaction-scroll'});
  }
  let lastScroll=0;
  function sampledScroll(){
    const now=Date.now();
    if(now-lastScroll<250)return;
    lastScroll=now;fromScroll();
  }
  function fromFeather(event){
    if(event?.detail?.stopped===true){
      // A Feather signal stops recording and playback immediately.
      pause();
    }
  }
  const browserInputs=[
    ['pointerup',fromPointer],['input',fromInput],['change',fromChoice],
    ['keydown',fromKeys],['scroll',sampledScroll],
  ];
  function removeCaptureListeners(){
    for(const [type,handler] of browserInputs)document?.removeEventListener?.(type,handler,true);
    scope.removeEventListener?.('wayglass:material-wake',fromMaterial);
    unsubscribeObserver?.();unsubscribeObserver=null;
    unsubscribeWatercolor?.();unsubscribeWatercolor=null;
  }
  function observe(){
    if(disposed)throw new Error('Spectral field has been disposed.');
    if(active)return status();
    if(featherState()?.feather_stopped)throw new Error('Feather Stop is active.');
    active=true;error=null;
    for(const [type,handler] of browserInputs)document?.addEventListener?.(type,handler,true);
    scope.addEventListener?.('wayglass:material-wake',fromMaterial);
    unsubscribeObserver=observerSubscribe?.(packet=>{
      if(!packet?.status)return;
      capture({kind:'route',strength:packet.status==='completed'?.82:.6,
        motion:packet.status==='started'?.7:.3,continuity:.8,intent:.75,
        source_ref:'wayglass:route-observation'});
    });
    unsubscribeWatercolor=watercolorSubscribe?.(packet=>{
      capture({kind:'observer',strength:clamp(packet?.intensity,.5),
        motion:clamp(packet?.flow,.4),continuity:.75,intent:.6,
        source_ref:'wayglass:watercolor-activity'});
    });
    capture({kind:'presence',strength:.35,continuity:.9,source_ref:'wayglass:field-entry'});
    notify();return status();
  }
  function stopHearing(){
    heard=false;audio.stop();notify();return status();
  }
  async function hear(){
    if(!active||disposed)throw new Error('Enable the spectral field before listening.');
    if(featherState()?.feather_stopped)throw new Error('Feather Stop is active.');
    if(!lastFrame)throw new Error('A verified Wyrdrune frame is required before audio begins.');
    const state=await audio.start();
    if(!active||disposed||!state.running){audio.stop();throw new Error('The acoustic output could not begin.');}
    heard=true;listenFrame(lastFrame);notify();return status();
  }
  function pause(){
    active=false;queue=[];error=null;haptics=false;
    if(typeof scope.navigator?.vibrate==='function'){try{scope.navigator.vibrate(0)}catch{}}
    if(timer!==null){scope.clearTimeout(timer);timer=null}
    abort?.abort();abort=null;
    removeCaptureListeners();stopHearing();notify();return status();
  }
  function setAffinity(value){affinity=clamp(value);notify();return affinity}
  function setHaptics(value){
    if(!active||disposed||featherState()?.feather_stopped)throw new Error('Haptics require active spectral consent.');
    haptics=value===true;
    if(!haptics&&typeof scope.navigator?.vibrate==='function'){try{scope.navigator.vibrate(0)}catch{}}
    notify();return haptics;
  }
  function subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('A spectral subscriber function is required.');
    listeners.add(listener);listener(status());
    return ()=>listeners.delete(listener);
  }
  function dispose(){
    if(disposed)return;
    pause();disposed=true;
    scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,fromFeather);
    audio.dispose();notify();listeners.clear();
  }
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,fromFeather);
  return Object.freeze({observe,pause,hear,stopHearing,setAffinity,setHaptics,subscribe,capture,flush,status,dispose});
}
