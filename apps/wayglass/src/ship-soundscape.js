// One opt-in Wyrdrune score bus shared by Wayglass rooms. The WTL host
// composes the actual notes; this bridge only projects validated score frames.
import {createAcousticAudioEngine} from './acoustic-audio-engine.js';
import {scoreWyrdruneStory} from './route-client.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from './somatic-sound.js';

const audio=createAcousticAudioEngine();
let last=null,disposed=false,serial=0,playing=false;
const subscribers=new Set();
const notify=()=>{for(const f of [...subscribers])try{f(snapshot());}catch{}};
function snapshot(){
  const state=audio.getState();
  return Object.freeze({schema:'wayglass.ship-soundscape/v1',playing:playing&&state.running,
    status:state.status,device_error:state.lastError,score_ready:!!last,
    score_receipt:last?.story_sha256||null,score:last?.score||null});
}
export const shipSoundscape=Object.freeze({
  snapshot,
  subscribe(fn){subscribers.add(fn);fn(snapshot());return ()=>subscribers.delete(fn);},
  async compose({text='',turns=0,affinity=0.5,participants=[
    {id:'participant:rowan',kind:'participant-declared'},
    {id:'route:wayglass:ship',kind:'model-route'},
  ]}={}){
    if(disposed)throw new Error('Ship soundscape disposed');
    if(wayglassSomaticSound.snapshot().feather_stopped)throw new Error('Feather Stop active');
    const revision=++serial;
    const frame=await scoreWyrdruneStory({text:String(text).slice(0,4900),turns,affinity,participants});
    if(revision!==serial)return null;
    if(frame.schema!=='wayglass.wyrdrune-story-soundscape/v0.1'
      ||frame.withness?.completedCycles!==2||frame.eightfold?.length!==16)
      throw new Error('Wyrdrune score receipt incomplete');
    last=frame;
    if(playing)audio.update({muted:false,ambience:true,score:frame.score});
    notify();return frame;
  },
  setScore(frame){
    if(!frame||frame.schema!=='wayglass.wyrdrune-story-soundscape/v0.1'
      ||frame.withness?.completedCycles!==2||frame.eightfold?.length!==16)
      throw new TypeError('A verified two-cycle Wyrdrune score is required');
    last=frame;++serial;
    if(playing)audio.update({muted:false,ambience:true,score:frame.score});
    notify();
  },
  async enable({mono=true}={}){
    if(wayglassSomaticSound.snapshot().feather_stopped)throw new Error('Feather Stop active');
    if(!last)throw new Error('Compose a Wyrdrune score before enabling soundtrack');
    const state=await audio.start();
    if(!state.running){notify();throw new Error('Audio unavailable: '+(state.lastError||state.status));}
    audio.update({muted:false,mono,ambience:true,score:last.score});
    playing=true;notify();return snapshot();
  },
  setMono(mono){if(playing)audio.update({mono:!!mono});notify();},
  stop(){++serial;playing=false;audio.stop();notify();return snapshot();},
  // Sound is not silently activated on returning to a room.
});
globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,event=>{
  if(event?.detail?.stopped===true)shipSoundscape.stop();
});
