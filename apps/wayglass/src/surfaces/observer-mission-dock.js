/**
 * N-016 mission dock. Real Wayglass research, dream and provenance instruments.
 * The source concept image illustrates layout/materials only. This dock neither
 * fabricates data nor sends messages or research tasks.
 */
export const WAYGLASS_MISSION_DOCK_SCHEMA='wayglass.mission-dock/v1';
const DESTINATIONS=Object.freeze([
  Object.freeze({
    id:'research',eyebrow:'01 · INQUIRE',title:'Research Studio',
    description:'Inspect mathematics, compare source geometry and preserve trial receipts.',
    button:'Open invariant trial',selector:'[data-wg-science-host]',
    tab:'[data-wg-science-action="lens-invariants"]',
    note:'Local mathematical trials · no model call',
  }),
  Object.freeze({
    id:'sandbox',eyebrow:'02 · IMAGINE',title:'Dream Sandbox',
    description:'Run a local hypothesis experiment with explicit epistemic boundaries.',
    button:'Explore sandbox',selector:'.observer-dream',
    tab:null,note:'Private hypothesis only · no canon write',
  }),
  Object.freeze({
    id:'provenance',eyebrow:'03 · TRACE',title:'Provenance',
    description:'Read source-attributed light events and their evidence limitations.',
    button:'Inspect provenance',selector:'.observer-wonder',
    tab:null,note:'Receipts where available · never a truth claim',
  }),
]);
export function mountObserverMissionDock(root){
  const observer=root?.querySelector?.('.wg-living-observer');
  if(!observer)return ()=>{};
  const science=observer.querySelector('[data-wg-science-host]');
  if(!science)return ()=>{};
  const dock=document.createElement('section');
  dock.className='wg-mission-dock';
  dock.dataset.wayglassMissionDock='n016';
  dock.setAttribute('aria-label','Wayglass mission dock');
  const intro=document.createElement('div');intro.className='wg-mission-intro';
  const over=document.createElement('p');over.className='eyebrow';over.textContent='WAYGLASS · THREE WORKING INSTRUMENTS';
  const heading=document.createElement('h2');heading.textContent='Choose a working deck';
  const aside=document.createElement('p');aside.className='tiny';
  aside.textContent='These open existing local tools. None triggers a model, a provider route or a new evidence claim.';
  intro.append(over,heading,aside);dock.append(intro);
  const cards=document.createElement('div');cards.className='wg-mission-cards';
  for(const destination of DESTINATIONS){
    const card=document.createElement('article');
    card.className='wg-mission-card';
    card.dataset.mission=destination.id;
    const optic=document.createElement('div');
    optic.className='wg-mission-optic';optic.setAttribute('aria-hidden','true');
    const eyebrow=document.createElement('span');eyebrow.className='wg-mission-eyebrow';eyebrow.textContent=destination.eyebrow;
    const title=document.createElement('h3');title.textContent=destination.title;
    const body=document.createElement('p');body.textContent=destination.description;
    const action=document.createElement('button');action.type='button';
    action.className='glass-chip wg-mission-action';
    action.dataset.missionTarget=destination.id;action.textContent=destination.button;
    const note=document.createElement('small');note.textContent=destination.note;
    card.append(optic,eyebrow,title,body,action,note);cards.append(card);
  }
  dock.append(cards);
  science.parentNode.insertBefore(dock,science);
  const onClick=event=>{
    const action=event.target.closest?.('[data-mission-target]');
    if(!action||!dock.contains(action))return;
    const target=DESTINATIONS.find(item=>item.id===action.dataset.missionTarget);
    if(!target)return;
    const section=observer.querySelector(target.selector);
    if(!section)return;
    if(target.tab)section.querySelector(target.tab)?.click();
    section.scrollIntoView?.({behavior:'auto',block:'start'});
    // Visible and accessible return target, no auto run/send.
    const focusTarget=target.tab?section.querySelector(target.tab):
      section.querySelector('h2, h3, button, summary');
    focusTarget?.focus?.({preventScroll:true});
  };
  dock.addEventListener('click',onClick);
  return ()=>{dock.removeEventListener('click',onClick);dock.remove();};
}
