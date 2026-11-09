// One persistent acoustic engine / AudioContext for Wyrdrune soundscape playback.
// This module does not compose music: the original WTL runs through #581's
// composition provider and the extended WTL through #580's authenticated host.
import {createAcousticAudioEngine} from './acoustic-audio-engine.js';
import {scoreWyrdruneStory} from './route-client.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from './somatic-sound.js';

export const SHIP_SCORE_SOURCES=Object.freeze({
  owner:'scores/wyrdrune/story-soundscape-v0.1.wtl',
  extended:'lib/wyrdrune/story-soundscape.wtl',
});
function assertExtended(frame){
  if(frame?.schema!=='wayglass.wyrdrune-story-soundscape/v0.1'||
     frame?.withness?.completedCycles!==2||frame?.eightfold?.length!==16||
     typeof frame?.program_sha256!=='string'||!/^[a-f0-9]{64}$/i.test(frame.program_sha256))
    throw new TypeError('A verified 16-phase Wyrdrune host score and source digest are required.');
}
export function createShipSoundscape({audio=createAcousticAudioEngine(),scoreStory=scoreWyrdruneStory,
  feather=wayglassSomaticSound,scope=globalThis}={}){
  let source='owner',extended=null,revision=0,playingExtended=false;
  const subscribers=new Set();
  function snapshot(){
    return Object.freeze({
      schema:'wayglass.ship-soundscape/v1',
      source,source_ref:SHIP_SCORE_SOURCES[source],playing:source==='extended'&&playingExtended&&audio.getState().running,
      score_ready:!!extended,score_digest:source==='extended'?extended?.program_sha256??null:null,
      story_digest:source==='extended'?extended?.story_sha256??null:null,
      original_program:source==='owner'?audio.composition.snapshot().program??null:null,
      output_status:audio.getState().status,
    });
  }
  function notify(){const state=snapshot();for(const callback of [...subscribers])try{callback(state);}catch{}return state;}
  function selectOwner(){
    revision++;playingExtended=false;source='owner';
    audio.update({score:null});
    return notify();
  }
  function selectExtended(){
    revision++;source='extended';playingExtended=false;
    audio.composition.pauseGeneration();
    audio.composition.disableAudio();
    audio.update({score:null});
    return notify();
  }
  function setExtended(frame){
    assertExtended(frame);extended=frame;
    if(source==='extended'&&playingExtended)
      audio.update({muted:false,ambience:true,score:frame.score});
    return notify();
  }
  async function composeExtended({text='',turns=0,affinity=0.5,participants=[
    {id:'participant:rowan',kind:'participant-declared'},
    {id:'route:wayglass:ship',kind:'model-route'},
  ]}={}){
    if(feather.snapshot().feather_stopped)throw new Error('Feather Stop active');
    const token=++revision;
    const frame=await scoreStory({text:String(text).slice(0,4900),turns,affinity,participants});
    assertExtended(frame);
    if(token!==revision)return null; // A later choice supersedes this response.
    return setExtended(frame);
  }
  async function playExtended({mono=true}={}){
    if(feather.snapshot().feather_stopped)throw new Error('Feather Stop active');
    if(!extended)throw new Error('Compose a verified Wyrdrune host score first.');
    if(source!=='extended')selectExtended();
    const state=await audio.start(); // Called directly from a user gesture.
    if(!state.running)throw new Error('Audio unavailable: '+(state.lastError||state.status));
    audio.update({muted:false,ambience:true,mono,score:extended.score});
    playingExtended=true;return notify();
  }
  function stop(){
    revision++;playingExtended=false;
    audio.stop({pauseComposition:false});
    return notify();
  }
  function onFeather(event){if(event?.detail?.stopped===true)stop();}
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  return Object.freeze({
    audio,snapshot,selectOwner,selectExtended,setExtended,composeExtended,playExtended,stop,
    setMono(value){if(source==='extended'&&playingExtended)audio.update({mono:!!value});return notify();},
    subscribe(callback){subscribers.add(callback);callback(snapshot());return()=>subscribers.delete(callback);},
    // Isolated tests can tear down their own bus. The ship instance persists.
    dispose(){scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);stop();audio.dispose();subscribers.clear();},
  });
}
export const shipSoundscape=createShipSoundscape();
