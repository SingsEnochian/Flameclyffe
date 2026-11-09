import {createStoryCompositionBinding} from '../../../lib/wayglass-story-score.mjs';
import {wayglassSomaticSound} from './somatic-sound.js';
const KEY='wayglass.story-composition.return/v1';
let text='',turns=0,installed=false;
export const wayglassStoryScoreBinding=createStoryCompositionBinding({composition:wayglassSomaticSound.composition,getText:()=>text,getTurns:()=>turns,restoreTurns:value=>{turns=value;},
 getAnchor:()=>({schema:'wayglass.local-score-anchor/v1',anchor_id:globalThis.crypto.randomUUID(),source_ref:'owner-declared:wayglass-composer'}),source_ref:'wayglass:current-composer-input'});
export function installWayglassStoryComposition({scope=globalThis,document=scope.document,observe}={}){
 if(installed)return;installed=true;let restored=false;
 try{const raw=scope.localStorage.getItem(KEY);if(raw){const value=JSON.parse(raw);wayglassStoryScoreBinding.restore(value.binding);wayglassSomaticSound.composition.restore(value.composition);turns=value.turns||0;restored=true;}}catch{restored=true;wayglassSomaticSound.composition.pauseGeneration();wayglassSomaticSound.composition.disableAudio();}
 document?.addEventListener('input',event=>{if(['wc-prompt','wg-input'].includes(event.target?.id))text=String(event.target.value||'').slice(0,1000000);});
 if(typeof observe==='function')observe(reading=>{if(reading.status==='completed')turns++;});
 wayglassSomaticSound.composition.subscribe(()=>{try{scope.localStorage.setItem(KEY,JSON.stringify({schema:KEY,binding:wayglassStoryScoreBinding.checkpoint(),composition:wayglassSomaticSound.composition.checkpoint(),turns}));}catch{}});
 // Rowan requested continuous composition. A fresh region evolves quietly;
 // recovered or stopped regions never restart themselves or enable output.
 if(!restored&&!wayglassSomaticSound.snapshot().feather_stopped)wayglassSomaticSound.composition.startGeneration({confirmed:true});
}
