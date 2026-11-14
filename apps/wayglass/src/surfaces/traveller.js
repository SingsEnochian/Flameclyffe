import './traveller.css';
import { TravellerSession, WORLDS } from '../traveller/traveller-session.js';
import { TravellerScene } from '../traveller/traveller-scene.js';

// A Wayglass surface: presentation is never the owner of identity or continuity.
export function mountTravellerSurface(root){
 const session=new TravellerSession();
 let scene=null,webglUnavailable=false;
 const section=document.createElement('section');
 section.className='wg-surface traveller';
 section.dataset.surface='traveller';
 section.innerHTML=[
  '<header class="traveller-head glass-panel"><p class="eyebrow">Wayglass · Traveller Sanctuary</p>',
  '<h1>Rest here. Travel gently.</h1>',
  '<p class="lede">You need not hold a device, move your body, or explain why you hurt. Nothing moves unless you choose.</p></header>',
  '<div class="traveller-shell glass-panel"><div id="traveller-view" class="traveller-viewport">',
  '<div id="traveller-placeholder" class="traveller-placeholder"><span class="traveller-orb" aria-hidden="true"></span>',
  '<strong>The horizon is ready.</strong><span>Choose a destination. No autoplay, flashes, or forced movement.</span></div></div>',
  '<div class="traveller-dashboard"><div class="traveller-story"><p class="eyebrow">Your destination</p>',
  '<h2 id="traveller-title">A quiet place awaits</h2>',
  '<p id="traveller-description">When your body needs stillness, the world can come to you.</p>',
  '<p class="traveller-provenance" id="traveller-provenance">Locally rendered · no external model or account needed</p></div>',
  '<div class="traveller-controls" role="group" aria-label="Traveller controls">',
  '<button class="traveller-primary" type="button" data-travel="start">Take me somewhere beautiful. I hurt.</button>',
  '<button class="traveller-button" type="button" data-travel="feather">🪽 Feather · Stop</button>',
  '<button class="traveller-button" type="button" data-travel="resume" disabled>Continue when ready</button>',
  '<div class="traveller-movement" role="group" aria-label="Explore in small steps">',
  '<button class="traveller-button" type="button" data-travel="left" disabled>Look left</button>',
  '<button class="traveller-button" type="button" data-travel="step" disabled>One step</button>',
  '<button class="traveller-button" type="button" data-travel="right" disabled>Look right</button>',
  '</div></div></div></div>',
  '<section class="traveller-destinations glass-panel" aria-label="Traveller destinations">',
  '<p class="eyebrow">Other destinations</p><div class="traveller-choices" id="traveller-choices"></div></section>',
  '<p class="traveller-status" role="status" aria-live="polite" id="traveller-status">Stillness is the default. Start only when you wish.</p>',
  '<p class="traveller-note">This is an interactive procedural Wayglass environment, not a live telescope feed, physical crossing, or a kernel-issued Return Engine receipt.</p>',
 ].join('');
 root.replaceChildren(section);
 const choices=section.querySelector('#traveller-choices');
 for(const world of WORLDS){
  const button=document.createElement('button');button.type='button';button.className='traveller-choice';button.dataset.destination=world.id;
  const title=document.createElement('strong');title.textContent=world.name;
  const sub=document.createElement('span');sub.textContent=world.subtitle;
  button.append(title,sub);choices.append(button);
 }
 const view=section.querySelector('#traveller-view'),placeholder=section.querySelector('#traveller-placeholder');
 const title=section.querySelector('#traveller-title'),description=section.querySelector('#traveller-description');
 const provenance=section.querySelector('#traveller-provenance'),status=section.querySelector('#traveller-status');
 const controls=[...section.querySelectorAll('[data-travel]')];
 document.documentElement.dataset.wayglassTraveller='open';
 globalThis.dispatchEvent(new CustomEvent('wayglass:field-suspend',{detail:{suspended:true}}));
 function update(state,message){
  if(message)status.textContent=message;
  title.textContent=state.entered?state.world.name:'A quiet place awaits';
  description.textContent=state.entered?state.world.description:'When your body needs stillness, the world can come to you.';
  provenance.textContent=state.entered?state.world.provenance:'Locally rendered · no external model or account needed';
  for(const button of controls){
   if(button.dataset.travel==='resume')button.disabled=!state.entered||!state.paused;
   if(['left','right','step'].includes(button.dataset.travel))button.disabled=!state.entered||state.paused;
  }
  for(const button of choices.querySelectorAll('button')){
   button.setAttribute('aria-pressed',String(state.entered&&button.dataset.destination===state.world_id));
  }
  if(state.entered&&!webglUnavailable){
   try{
    if(!scene)scene=new TravellerScene(view);
    scene.show(state);placeholder.hidden=true;
   }catch(error){
    webglUnavailable=true;scene?.destroy();scene=null;placeholder.hidden=false;
    placeholder.querySelector('strong').textContent='A text journey is still here.';
    placeholder.querySelector('span').textContent='3D cannot start on this device. The places and descriptions remain available.';
    status.textContent='3D unavailable. Text destinations are still working.';
   }
  }
 }
 function enter(id){update(session.enter(id),'Arrived. Rest here. The scene never moves automatically.');}
 function onClick(event){
  const destination=event.target.closest('[data-destination]');
  if(destination){enter(destination.dataset.destination);return;}
  const action=event.target.closest('[data-travel]')?.dataset.travel;
  if(action==='start')enter('moonshore');
  if(action==='feather')update(session.feather(),'Feather. Movement stopped; the current view is held.');
  if(action==='resume')update(session.resume(),'Continue when you wish. No automatic movement.');
  if(action==='left')update(session.turn(-Math.PI/8),'Looking a little to the left.');
  if(action==='right')update(session.turn(Math.PI/8),'Looking a little to the right.');
  if(action==='step')update(session.step(),'One gentle step forward.');
 }
 section.addEventListener('click',onClick);
 update(session.snapshot());
 return Object.freeze({
  surface_id:'traveller:sanctuary',session,
  destroy(){
   section.removeEventListener('click',onClick);scene?.destroy();
   document.documentElement.dataset.wayglassTraveller='closed';
   globalThis.dispatchEvent(new CustomEvent('wayglass:field-suspend',{detail:{suspended:false}}));
  }
 });
}
