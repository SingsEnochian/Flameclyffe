import {compileWyrdruneInterface} from './wtl-interface-executable.js';
// Shipwide Wyrdrune presentation source. Browser DOM remains the accessible renderer.
// Compile deterministically; no arbitrary scripts, provider access or autonomous promotion.
export const WAYGLASS_HELM_WTL=`interface {
 title "Wayglass · Living Ship"
 material opaline
 heading "WAYGLASS"
 text "Living Ship / One Universe"
 action feather "Feather"
 action open-writing "Writing Room"
 action open-codex "Universal Codex"
}`;
export const WAYGLASS_HELM_IR=compileWyrdruneInterface(WAYGLASS_HELM_WTL,{author:'wayglass-native-ship',provenance:'repository:apps/wayglass/src/ship-wyrdrune-interface.js'});
export function readWayglassHelmWyrdrune(){
 const p=WAYGLASS_HELM_IR.proposal;
 return Object.freeze({schema:WAYGLASS_HELM_IR.schema,source:p.wtl_source,title:p.title,material:p.material,nodes:p.nodes,author:p.author,provenance:p.provenance});
}
