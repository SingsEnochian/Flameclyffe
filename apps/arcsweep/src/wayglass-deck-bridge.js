import {installCompositionDeckChannel} from '../../../lib/wayglass-composition-deck-channel.mjs';
// Narrow same-origin deck channel: no credentials, model identity or arbitrary commands.
export const ARCSWEEP_DECK_SCHEMA = 'wayglass.arcsweep-deck/v1';
const KINDS = new Set(['init', 'ready', 'feather', 'return', 'return-held']);
export function isArcSweepDeckMessage(data) {
  return Boolean(data && typeof data === 'object' && !Array.isArray(data) &&
    Object.keys(data).length === 3 && Object.keys(data).every(key => ['schema','kind','session'].includes(key)) &&
    data.schema === ARCSWEEP_DECK_SCHEMA && KINDS.has(data.kind) &&
    typeof data.session === 'string' && /^[a-f0-9-]{16,64}$/i.test(data.session));
}
export function installArcSweepDeckBridge({scope=globalThis,stopOutput,persist,ready=false,composition=null,storyBinding=null}={}) {
  if (scope.parent === scope || new URLSearchParams(scope.location?.search || '').get('wayglassDeck') !== '1') return ()=>{};
  if(typeof stopOutput!=='function' || typeof persist!=='function')throw new TypeError('Deck output stop and state persistence required');
  const origin=scope.location.origin;
  let session=null,coreReady=ready,disposed=false,returning=false;
  const disposeComposition=installCompositionDeckChannel({scope,composition,getPeer:()=>scope.parent,getSession:()=>session,isReady:()=>coreReady&&!returning,expectedSources:['wayglass-watercolor','wayglass-acoustic'],getProgramContext:()=>storyBinding?.getContext(),applyProgramContext:value=>storyBinding?.setContext(value)});
  const send=kind=>{if(session&&!disposed)scope.parent.postMessage({schema:ARCSWEEP_DECK_SCHEMA,kind,session},origin);};
  const onReady=()=>{coreReady=true;send('ready');};
  const onMessage=async event=>{
    if(disposed||event.origin!==origin||event.source!==scope.parent||!isArcSweepDeckMessage(event.data))return;
    if(event.data.kind==='init'){
      // A document gets one channel; later attempts cannot substitute its parent session.
      if(session && session!==event.data.session)return;
      session=event.data.session;if(coreReady)send('ready');return;
    }
    if(event.data.session!==session||!session)return;
    if(event.data.kind==='feather'){stopOutput();return;}
    if(event.data.kind==='return'&&!returning){
      returning=true;stopOutput();
      try{const saved=await persist();if(saved?.ok!==true)throw new Error('State save unconfirmed');send('return');returning=false;}catch{ returning=false;send('return-held'); }
    }
  };
  const onFeather=()=>{stopOutput();send('feather');};
  scope.addEventListener('message',onMessage);
  scope.addEventListener('arcsweep:core-ready',onReady);
  scope.addEventListener('wayglass:feather-request',onFeather);
  return ()=>{disposed=true;disposeComposition();stopOutput();scope.removeEventListener('message',onMessage);
    scope.removeEventListener('arcsweep:core-ready',onReady);scope.removeEventListener('wayglass:feather-request',onFeather);};
}
