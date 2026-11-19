import {compileWyrdruneInterface} from './wtl-interface-executable.js';
export const WAYGLASS_DESIGN_CHOICES=Object.freeze([
 Object.freeze({id:'quiet',material:'clear',heading:'WAYGLASS',subtitle:'Quiet presence · ready to listen'}),
 Object.freeze({id:'watercolour',material:'opaline',heading:'WAYGLASS',subtitle:'Watercolour · motion and wonder'}),
 Object.freeze({id:'labradorite',material:'labradorite',heading:'WAYGLASS',subtitle:'Labradorite · depth and discovery'}),
 Object.freeze({id:'hearth',material:'amber',heading:'WAYGLASS',subtitle:'Amber · warmth and continuity'}),
 Object.freeze({id:'garden',material:'moss',heading:'WAYGLASS',subtitle:'Moss · living systems'})
]);
export const WAYGLASS_DESIGN_KEY='wayglass.wtl-design-choice/v1';
const encode=value=>JSON.stringify(String(value));
export function chooseWayglassDesign({routeActive=false,featherStopped=false,audioEnabled=false}={}){
 const id=featherStopped?'quiet':routeActive?'labradorite':audioEnabled?'watercolour':'garden';
 return Object.freeze({id,reason:featherStopped?'Feather holds motion and sensation':routeActive?'Route activity invites deeper legibility':audioEnabled?'Audio is enabled; favour expressive colour':'Idle state favours a quiet living surface',source:'deterministic-local-design-policy',notModelPreference:true});
}
export function compileWayglassDesign(choice){
 const design=WAYGLASS_DESIGN_CHOICES.find(item=>item.id===choice.id);
 if(!design)throw new TypeError('Unknown design choice');
 const source=`interface {
 title "Wayglass · Living Ship"
 material ${design.material}
 heading ${encode(design.heading)}
 text ${encode(design.subtitle)}
 action feather "Feather"
 action open-writing "Writing Room"
 action open-codex "Universal Codex"
}`;
 const ir=compileWyrdruneInterface(source,{author:'wayglass-local-design-policy',provenance:'wayglass:design-policy/v1:'+choice.id});
 return Object.freeze({choice,ir});
}
export function createWayglassDesignMemory({storage=globalThis.localStorage,key=WAYGLASS_DESIGN_KEY}={}){
 function read(){try{const raw=storage?.getItem(key);if(!raw)return null;const value=JSON.parse(raw);return value?.schema===WAYGLASS_DESIGN_KEY&&WAYGLASS_DESIGN_CHOICES.some(item=>item.id===value.id)?value:null;}catch{return null;}}
 function save(choice){if(!WAYGLASS_DESIGN_CHOICES.some(item=>item.id===choice.id))throw new TypeError('Unknown design choice');const record={schema:WAYGLASS_DESIGN_KEY,id:choice.id,reason:choice.reason,source:choice.source,recorded_at:new Date().toISOString()};storage?.setItem(key,JSON.stringify(record));return record;}
 return {read,save};
}
