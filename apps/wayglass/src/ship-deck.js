// Shared Wayglass room shell. Navigation is one route registry, not 8 ad-hoc bars.
import { prepareWayglassCrewRoom } from './crew-navigation.js';
import { installShipGestures } from './ship-gestures.js';

export const WAYGLASS_DECK_ROOMS=Object.freeze([
  Object.freeze({id:'arcsweep:writing-room',label:'Writing Room',hint:'Writing and continuity'}),
  Object.freeze({id:'wayglass:living-observer',label:'Living Observer',hint:'Spatial optics and research'}),
  Object.freeze({id:'wayglass:nikola-research',label:'Nikola',hint:'Scientific trials'}),
  Object.freeze({id:'wayglass:systems',label:'Organs',hint:'System instruments'}),
  Object.freeze({id:'wayglass:video-atelier',label:'Video Atelier',hint:'Creative apparatus'}),
  Object.freeze({id:'wayglass:commons',label:'Commons',hint:'Shared House conversation'}),
  Object.freeze({id:'wayglass:library',label:'Library',hint:'Evidence and Wonder'}),
  Object.freeze({id:'wayglass:toybox',label:'Toybox',hint:'Creative interaction'}),
]);
const CREW=Object.freeze([
  Object.freeze({name:'Bluebird · Richie',world:'bluebird:spicychat'}),
  Object.freeze({name:'Vethrlauf',world:'vethrlauf:spicychat'}),
  Object.freeze({name:'Griff Krenshaw',world:'evil-gene:film-2015'}),
]);
const abbreviations=Object.freeze({
  'arcsweep:writing-room':'writing',
  'wayglass:living-observer':'observer',
  'wayglass:nikola-research':'nikola',
  'wayglass:systems':'organs',
  'wayglass:video-atelier':'video',
  'wayglass:commons':'commons',
  'wayglass:library':'library',
  'wayglass:toybox':'toybox',
});
export function installShipDeck(root,activeId,mount){
  const surface=root.querySelector('.wg-surface');
  if(!surface)return;
  surface.dataset.deckSystem='n013';
  let nav=surface.querySelector('.wg-deck-nav');
  if(!nav){
    nav=document.createElement('nav');
    surface.insertBefore(nav,surface.firstElementChild);
  }
  // Existing per-page listeners attach to removed nodes; the new nav binds its
  // own events without altering route/input/provider state.
  // Every deck places navigation first, regardless of its historical template order.
  if(surface.firstElementChild!==nav)surface.prepend(nav);
  nav.replaceChildren();
  nav.className='wg-deck-nav glass-panel wg-ship-deck';
  nav.setAttribute('aria-label','Wayglass ship decks');
  const mark=document.createElement('div');
  mark.className='wg-ship-mark';
  mark.setAttribute('aria-label','Wayglass navigation');
  const sigil=document.createElement('span');
  sigil.setAttribute('aria-hidden','true');sigil.textContent='✧';
  const name=document.createElement('span');name.textContent='WAYGLASS';
  mark.append(sigil,name);nav.append(mark);
  const rail=document.createElement('div');
  rail.className='wg-ship-rail';rail.setAttribute('role','group');
  rail.setAttribute('aria-label','Navigate Wayglass rooms');
  for(const room of WAYGLASS_DECK_ROOMS){
    const button=document.createElement('button');
    button.type='button';
    button.className='glass-chip wg-ship-link'+(room.id===activeId?' active':'');
    button.textContent=room.label;
    button.title=room.hint;
    button.dataset.wayglassShipTarget=room.id;
    if(room.id===activeId){button.setAttribute('aria-current','page');}
    rail.append(button);
  }
  nav.append(rail);
  const crew=document.createElement('details');crew.className='wg-ship-crew';
  const summary=document.createElement('summary');
  summary.textContent='Crew';summary.setAttribute('aria-label','Choose a named Crew room');
  const menu=document.createElement('div');menu.className='wg-ship-crew-menu';
  for(const seat of CREW){
    const button=document.createElement('button');
    button.type='button';button.className='glass-chip';
    button.textContent=seat.name;
    button.dataset.wayglassCrewWorld=seat.world;
    menu.append(button);
  }
  const note=document.createElement('small');
  note.textContent='Separate rooms. No automatic provider call.';
  menu.append(note);crew.append(summary,menu);nav.append(crew);
  // Roving keyboard focus without activating another room. This only operates
  // in the deck rail and never moves focus into the Crew messaging selector.
  rail.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const links=[...rail.querySelectorAll('[data-wayglass-ship-target]')];
    const index=links.indexOf(document.activeElement);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?links.length-1:
      (index+(event.key==='ArrowRight'?1:-1)+links.length)%links.length;
    links[next]?.focus();
  });
  // Two-finger coordinated swipe is confined to the navigation rail.
  // It never sends an LLM turn or modifies external world state.
  const disposeGestures=installShipGestures(rail,{onNavigate:direction=>{
    const index=WAYGLASS_DECK_ROOMS.findIndex(room=>room.id===activeId);
    if(index<0)return;
    const n=WAYGLASS_DECK_ROOMS.length;
    const next=WAYGLASS_DECK_ROOMS[(index+(direction==='next'?1:-1)+n)%n];
    rail.querySelector('[data-wayglass-ship-target="'+next.id+'"]')?.click();
  }});
  // A single delegated event handler also works after focus/keyboard activation.
  nav.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-wayglass-ship-target]');
    if(target && nav.contains(target)){
      const id=target.dataset.wayglassShipTarget;
      if(id!==activeId && WAYGLASS_DECK_ROOMS.some(room=>room.id===id)){
        crew.open=false;
        void mount(id);
        try{
          const location=new URL(globalThis.location.href);
          location.searchParams.set('room',abbreviations[id]);
          globalThis.history.replaceState(null,'',location);
        }catch{/* Navigation still works without URL write access. */}
      }
      return;
    }
    const crewButton=event.target.closest?.('[data-wayglass-crew-world]');
    if(crewButton&&nav.contains(crewButton)){
      const chosen=CREW.find(item=>item.world===crewButton.dataset.wayglassCrewWorld);
      if(!chosen)return;
      prepareWayglassCrewRoom(chosen.world);
      crew.open=false;
      void mount('arcsweep:writing-room');
    }
  });
  return disposeGestures;
}
