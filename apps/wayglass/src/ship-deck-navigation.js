// Navigation semantics belong to the ship, not to any individual room.
// Deliberately deterministic: no fabricated model status, no speculative presence.
export const SHIP_DECK_GROUPS=Object.freeze([
  Object.freeze({id:'contact',name:'First Contact',description:'Arrival, conversation and narrative'}),
  Object.freeze({id:'creation',name:'Creation decks',description:'Writing, sound and living worlds'}),
  Object.freeze({id:'observation',name:'Observatory',description:'Signals, instruments and continuity'}),
  Object.freeze({id:'commons',name:'Commons',description:'Research, community and the rest of the ship'}),
]);
const DESTINATIONS=Object.freeze({
  'wayglass:living-watercolor':'contact',
  'arcsweep:writing-room':'contact',
  'wayglass:journey-before-destination':'contact',
  'arcsweep:deck':'creation',
  'wayglass:sound-composition':'creation',
  'wayglass:acoustic-room':'creation',
  'wayglass:video-atelier':'creation',
  'wayglass:living-observer':'observation',
  'wayglass:spectral-field':'observation',
  'wayglass:quad-gestalt':'observation',
  'wayglass:systems':'observation',
  'wayglass:native-voice':'observation',
  'wayglass:library':'commons',
  'wayglass:commons':'commons',
  'wayglass:toybox':'commons',
});
export function shipDeckGroup(surfaceId){return DESTINATIONS[surfaceId]||'commons';}
export function shipDeckMatches({label='',surface_id=''},search=''){
  const query=String(search).trim().toLocaleLowerCase('en-GB');
  return !query || (String(label)+' '+String(surface_id)).toLocaleLowerCase('en-GB').includes(query);
}
export function shipDeckDestinationLabel(surfaceId,available=[]){
  return available.find(s=>s.surface_id===surfaceId)?.label||'Unidentified room';
}
