import {wayglassStoryScoreBinding} from '../story-score-binding.js';
import {installCompositionDeckChannel} from '../../../../lib/wayglass-composition-deck-channel.mjs';
import './arcsweep-deck.css';
import {ARCSWEEP_DECK_SCHEMA,isArcSweepDeckMessage} from '../../../arcsweep/src/wayglass-deck-bridge.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from '../somatic-sound.js';
const SESSION_KEY='wayglass.arcsweep-deck.return/v1';
export function mountArcSweepDeckSurface(root,{scope=globalThis,sound=wayglassSomaticSound,timeoutMs=30000,handshakeRetryMs=250}={}){
  root.innerHTML=`<section class="wg-surface wg-arcsweep-deck" data-surface="arcsweep-deck"><header class="glass-panel"><p class="eyebrow">Wayglass · ArcSweep</p><h1>Wayglass · World and continuity deck</h1><p>Wayglass inherits these ArcSweep world, writing and continuity instruments with their saved state. Sound starts by your choice.</p><div class="wg-deck-controls"><button type="button" class="glass-chip" data-deck-load>Open world deck</button><button type="button" class="glass-chip" data-deck-feather>Feather Stop</button><button type="button" class="glass-chip" data-deck-return>Return to Watercolor</button></div><p role="status" aria-live="polite" data-deck-status>The world deck has not loaded.</p></header><details class="glass-panel"><summary>Shape this region’s soundscape</summary><div data-deck-composer></div></details><div data-deck-frame></div></section>`;
  const q=selector=>root.querySelector(selector),status=q('[data-deck-status]'),holder=q('[data-deck-frame]');
  const load=q('[data-deck-load]'),feather=q('[data-deck-feather]'),back=q('[data-deck-return]');
  let frame=null,timer=null,handshakeTimer=null,returnTimer=null,awaitingReturn=false,deadlinePassed=false,ready=false,disposed=false,stopped=sound.snapshot().feather_stopped;
  const session=scope.crypto.randomUUID();
  const composerRoot=q('[data-deck-composer]');
  let composer=null;
  if(composerRoot&&sound.composition)void import('./sound-composition.js').then(({mountWayglassSoundComposition})=>{if(!disposed)composer=mountWayglassSoundComposition(composerRoot,{composition:sound.composition,soundscape:sound,storyBinding:wayglassStoryScoreBinding});}).catch(()=>{if(!disposed)composerRoot.textContent='The soundstage could not open. Your deck and saved score remain available.';});
  const disposeComposition=installCompositionDeckChannel({scope,composition:sound.composition,getPeer:()=>frame?.contentWindow,getSession:()=>session,isReady:()=>ready&&!stopped&&!awaitingReturn,expectedSources:['wayglass-arcsweep'],getProgramContext:()=>wayglassStoryScoreBinding.getContext(),applyProgramContext:value=>wayglassStoryScoreBinding.setContext(value)});
  const send=kind=>frame?.contentWindow?.postMessage({schema:ARCSWEEP_DECK_SCHEMA,kind,session},scope.location.origin);
  const sync=()=>{feather.textContent=stopped?'Release Feather':'Feather Stop';if(frame)frame.inert=stopped||!ready;};
  function returnToBody(){
    sound.stop();
    try{scope.sessionStorage.setItem(SESSION_KEY,JSON.stringify({schema:SESSION_KEY,source:'/arcsweep/',returned_at:new Date().toISOString(),child_state_saved:ready}));}catch{}
    void scope.__wayglassOS?.mount('wayglass:living-watercolor');
  }
  const onMessage=event=>{
    if(disposed||event.origin!==scope.location.origin||event.source!==frame?.contentWindow||!isArcSweepDeckMessage(event.data)||event.data.session!==session)return;
    if(event.data.kind==='ready'){
      ready=true;clearTimeout(timer);clearTimeout(handshakeTimer);status.textContent=stopped?'Wayglass deck ready · Feather is held. Release explicitly to interact.':'Wayglass deck ready · its saved workspace is open.';
      if(stopped)send('feather');sync();
    }else if(event.data.kind==='feather'){sound.feather();}
    else if(event.data.kind==='return'&&ready&&awaitingReturn){clearTimeout(returnTimer);awaitingReturn=false;returnToBody();}
    else if(event.data.kind==='return-held'&&awaitingReturn){clearTimeout(returnTimer);awaitingReturn=false;status.textContent='The world deck could not confirm its saved state. Your workspace remains open; choose Return again to retry.';}
  };
  const onFeather=()=>{stopped=sound.snapshot().feather_stopped;sync();if(stopped)send('feather');};
  const onLoad=()=>{
    if(disposed)return;
    load.disabled=true;status.textContent='Opening the world deck · waiting for its core to finish.';
    frame=root.ownerDocument.createElement('iframe');frame.title='Wayglass world and continuity instruments';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads');
    frame.setAttribute('referrerpolicy','same-origin');frame.src='/arcsweep/?open=1&wayglassDeck=1';
    // Module hydration can finish after the iframe load event. Keep the same
    // source/window/session-bound greeting until the real core acknowledges it.
    const greet=()=>{if(disposed||ready||deadlinePassed)return;send('init');handshakeTimer=setTimeout(greet,handshakeRetryMs);};
    frame.addEventListener('load',()=>{clearTimeout(handshakeTimer);greet();});holder.replaceChildren(frame);sync();
    timer=setTimeout(()=>{if(!disposed&&!ready){deadlinePassed=true;clearTimeout(handshakeTimer);status.textContent='The world deck is unavailable or did not finish opening. The inherited ArcSweep build must be staged on this host. You can return without changing saved state.';}},timeoutMs);
  };
  const onStop=()=>{if(stopped){sound.releaseFeather({confirmed:true});stopped=false;sync();status.textContent='Feather released. Sound remains off.';}else sound.feather();};
  const onReturn=()=>{if(ready){if(awaitingReturn)return;awaitingReturn=true;status.textContent='Saving the world deck state before returning…';send('return');
    returnTimer=setTimeout(()=>{if(!disposed&&awaitingReturn){awaitingReturn=false;status.textContent='The world deck has not confirmed its saved return. Your workspace remains open; choose Return again to retry.';}},15000);
  }else returnToBody();};
  load.addEventListener('click',onLoad);feather.addEventListener('click',onStop);back.addEventListener('click',onReturn);
  scope.addEventListener('message',onMessage);scope.addEventListener(WAYGLASS_FEATHER_EVENT,onFeather);sync();
  return {destroy(){composer?.destroy();disposed=true;disposeComposition();clearTimeout(timer);clearTimeout(handshakeTimer);clearTimeout(returnTimer);send('feather');sound.stop();frame?.remove();
    scope.removeEventListener('message',onMessage);scope.removeEventListener(WAYGLASS_FEATHER_EVENT,onFeather);
    load.removeEventListener('click',onLoad);feather.removeEventListener('click',onStop);back.removeEventListener('click',onReturn);}};
}
