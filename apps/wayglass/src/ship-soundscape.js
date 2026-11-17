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
  let source='owner',extended=null,timed=null,timedFinished=false,revision=0,playbackRevision=0,playingExtended=false,startingExtended=false;
  const subscribers=new Set();
  function snapshot(){
    return Object.freeze({
      schema:'wayglass.ship-soundscape/v1',
      source,source_ref:source==='extended'&&timed?timed.sourceRef:SHIP_SCORE_SOURCES[source],
      playing:source==='extended'&&playingExtended&&audio.getState().running,
      score_ready:!!(timed||extended),score_digest:source==='extended'?timed?.hash??extended?.program_sha256??null:null,
      score_title:timed?.title??null,score_finished:timedFinished,
      score_layer_count:timed?0:extended?2+(extended.score?.layers?.length??0):0,
      story_digest:source==='extended'&&!timed?extended?.story_sha256??null:null,
      original_program:source==='owner'?audio.composition.snapshot().program??null:null,
      output_status:audio.getState().status,
    });
  }
  function notify(){const state=snapshot();for(const callback of [...subscribers])try{callback(state);}catch{}return state;}
  function selectOwner(){
    const stopTimed=timed&&playingExtended;
    revision++;playbackRevision++;playingExtended=false;source='owner';
    if(startingExtended||stopTimed){startingExtended=false;audio.stop({pauseComposition:false});}
    audio.update({score:null});
    return notify();
  }
  function selectExtended(){
    const stopTimed=timed&&playingExtended;
    revision++;playbackRevision++;source='extended';playingExtended=false;
    if(startingExtended||stopTimed){startingExtended=false;audio.stop({pauseComposition:false});}
    audio.composition.pauseGeneration();
    audio.composition.disableAudio();
    audio.update({score:null});
    return notify();
  }
  function setExtended(frame){
    assertExtended(frame);
    if(timed){
      if(playingExtended||startingExtended)stop();
      timed=null;timedFinished=false;
    }
    if(source==='extended'&&playingExtended){
      try{audio.update({muted:false,ambience:true,score:frame.score});}
      catch(error){if(!audio.getState().running)playingExtended=false;notify();throw error;}
    }
    extended=frame;
    return notify();
  }
  async function composeTimed(loadScore,sourceRef){
    if(feather.snapshot().feather_stopped)throw new Error('Feather Stop active');
    const token=++revision;
    const score=await loadScore();
    if(token!==revision)return null;
    if(playingExtended||startingExtended)stop();
    timed={...score,sourceRef};timedFinished=false;
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
    if(!extended&&!timed)throw new Error('Compose a Wyrdrune score first.');
    if(source!=='extended')selectExtended();
    const token=++playbackRevision;
    startingExtended=true;
    timedFinished=false;
    try{
      if(timed){
        const started=await audio.playTimedScore(timed,()=>{if(token===playbackRevision)stop({finished:true});});
        if(!started||token!==playbackRevision)return snapshot();
      }else{
        const state=await audio.start(); // Called directly from a user gesture.
        if(token!==playbackRevision)return snapshot();
        if(!state.running)throw new Error('Audio unavailable: '+(state.lastError||state.status));
        audio.update({muted:false,ambience:true,mono,score:extended.score});
      }
      playingExtended=true;return notify();
    }catch(error){
      if(token===playbackRevision)stop();
      throw error;
    }finally{if(token===playbackRevision)startingExtended=false;}
  }
  function stop({finished=false}={}){
    revision++;playbackRevision++;playingExtended=false;startingExtended=false;timedFinished=finished;
    audio.stop({pauseComposition:false});
    return notify();
  }
  function onFeather(event){if(event?.detail?.stopped===true)stop();}
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  return Object.freeze({
    audio,snapshot,selectOwner,selectExtended,setExtended,composeExtended,composeTimed,playExtended,stop,
    setMono(value){if(source==='extended'&&playingExtended&&!timed)audio.update({mono:!!value});return notify();},
    subscribe(callback){subscribers.add(callback);callback(snapshot());return()=>subscribers.delete(callback);},
    // Isolated tests can tear down their own bus. The ship instance persists.
    dispose(){scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);stop();audio.dispose();subscribers.clear();},
  });
}
export const shipSoundscape=createShipSoundscape();
