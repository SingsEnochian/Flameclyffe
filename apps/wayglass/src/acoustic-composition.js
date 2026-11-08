import {createSoundComposition} from '../../../lib/wayglass-sound-composition.mjs';
import {createStoryCompositionBinding} from '../../../lib/wayglass-story-score.mjs';

export const ACOUSTIC_COMPOSITION_RETURN_SCHEMA='wayglass.acoustic-composition-return/v1';
export const ACOUSTIC_COMPOSITION_STORAGE_KEY='wayglass.acoustic-composition.return/v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const textValid=text=>typeof text==='string'&&text.length<=10000;

// One acoustic engine owns the regional score. This adapter binds the authored
// WTL program and its source declarations to the actual immutable field anchor.
export function createAcousticComposition({audio,getWorldReceipt,setPlayback=()=>{},setMono=()=>{},feather,releaseFeather}={}){
 if(!audio?.composition||typeof getWorldReceipt!=='function')throw new TypeError('Acoustic engine and field receipt bridge required');
 const engine=audio.composition;
 let storyText='';
 const storyBinding=createStoryCompositionBinding({composition:engine,getText:()=>storyText,getTurns:()=>0,
  getAnchor:()=>({schema:'wayglass.acoustic-story-anchor/v1',field:clone(getWorldReceipt()),source_ref:'apps/wayglass/src/acoustic-world-model.js#worldReceipt'}),
  source_ref:'acoustic-local:story-input'});
 function checkpoint(){return {schema:ACOUSTIC_COMPOSITION_RETURN_SCHEMA,world_snapshot_id:getWorldReceipt().snapshot_id,story_text:storyText,binding:storyBinding.checkpoint(),composition:engine.checkpoint()};}
 function validate(value,{worldSnapshotId=null}={}){
  if(!value||value.schema!==ACOUSTIC_COMPOSITION_RETURN_SCHEMA||!textValid(value.story_text)||typeof value.world_snapshot_id!=='string'||
   (worldSnapshotId!==null&&value.world_snapshot_id!==worldSnapshotId)||value.binding?.turns!==0||value.composition?.program?.source_kind!=='wyrdrune-program')throw new TypeError('Matching acoustic composition return required');
  // Validate before changing the live world or its audio. These disposable
  // score validators have no AudioContext, output adapter, timer or generation.
  const test=createSoundComposition({region:'wayglass-acoustic',timers:{setTimeout(){throw new Error('Return validation cannot generate');},clearTimeout(){}}});
  try{
   const binding=createStoryCompositionBinding({composition:test,getAnchor:()=>({})});
   binding.restore(value.binding);test.restore(value.composition);
  }finally{test.dispose();}
  return clone(value);
 }
 function restore(value){
  const valid=validate(value);
  audio.stop();storyBinding.restore(valid.binding);engine.restore(valid.composition);storyText=valid.story_text;
  setPlayback(false);return checkpoint();
 }
 const composition=Object.freeze({...engine,
  async enableAudio(options){
   if(options?.confirmed!==true)throw new Error('Explicit playback gesture required');
   if(engine.snapshot().feather_stopped)throw new Error('Feather held');
   if(engine.snapshot().score_status!=='source-score-ready')throw new Error('Wyrdrune score evaluation required before playback');
   setPlayback(true);
   try{const result=await engine.enableAudio(options);if(result.audio_enabled!==true)setPlayback(false);return result;}
   catch(error){setPlayback(false);throw error;}
  },
  disableAudio(){engine.disableAudio();setPlayback(false);return engine.snapshot();},
  setMix(patch){engine.setMix(patch);if(Object.hasOwn(patch,'mono'))setMono(patch.mono);return engine.snapshot();},
  checkpoint,restore,
 });
 return Object.freeze({composition,storyBinding,checkpoint,restore,validate,
  setStoryText(text){if(!textValid(text))throw new TypeError('Acoustic story text must be at most 10000 characters');storyText=text;return storyText;},
  getStoryText:()=>storyText,
  soundscape:{feather:()=>{if(typeof feather==='function')return feather();return engine.feather();},releaseFeather:options=>{if(options?.confirmed!==true)throw new Error('Explicit Feather release required');if(typeof releaseFeather==='function')return releaseFeather(options);return engine.releaseFeather(options);}},
 });
}
