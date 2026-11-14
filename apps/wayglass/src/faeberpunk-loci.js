// Wayglass five loci. A locus is a navigation promise, not a fabricated world or model presence.
// Sources: docs/architecture/WAYGLASS_OS_V0_1.md; docs/reference/inspiration-ledger.md.
export const FAEBERPUNK_LOCI=Object.freeze([
  Object.freeze({id:'door',label:'Door',room:'wayglass:living-watercolor',description:'Arrive through the living watercolour'}),
  Object.freeze({id:'identity',label:'Identity',room:'wayglass:systems',description:'Inspect the ship and its organs'}),
  Object.freeze({id:'worktable',label:'Codex',room:'arcsweep:writing-room',description:'Write in the Universal Codex'}),
  Object.freeze({id:'wonder',label:'Wonder',room:'wayglass:mythience-crossing',description:'Explore the Mythience membrane'}),
  Object.freeze({id:'return',label:'Return',room:'wayglass:journey-before-destination',description:'Inspect journey and continuity'}),
]);
export function faeberpunkLocusForRoom(room){
  return FAEBERPUNK_LOCI.find(locus=>locus.room===room)?.id||null;
}
export function faeberpunkLocusLinks(available){
  const ids=new Set((available||[]).map(item=>typeof item==='string'?item:item.surface_id));
  return FAEBERPUNK_LOCI.filter(locus=>ids.has(locus.room));
}
