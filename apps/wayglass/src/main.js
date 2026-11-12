import {mountWayglassSoundComposition} from './surfaces/sound-composition.js';
import {wayglassSomaticSound} from './somatic-sound.js';
import {wayglassStoryScoreBinding,installWayglassStoryComposition} from './story-score-binding.js';
import './styles.css';
import './faeberpunk.css';
import { installFaeberpunkBridge } from './faeberpunk-bridge.js';
import { emitMaterialSignal } from './material-state.js';
import './authorization.css';
import { openWayglassAuthorization } from './authorization.js';
import { installWayglassField } from './glass-field.js';
import { installMotionChoreography } from './motion-choreography.js';
import { installKeyboardControls } from './keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport, publishEmbodiment } from './embodiment.js';
import { enterWayglassWorld, leaveWayglassWorld, recoverWayglassDeparture, readVoyageMessages, replyToVoyage } from './route-client.js';
import { inspectWayglassDoubleMobius, traverseWayglassDoubleMobius } from './route-client.js';
import { installVoyageInbox } from './voyage-inbox.js';
import { createWayglassSpellingController } from './spelling-assistance.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepDeckSurface } from './surfaces/arcsweep-deck.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';
import { mountWayglassSystemsSurface } from './surfaces/systems.js';
import { mountWayglassSpectrumSurface } from './surfaces/spectral-field.js';
import { mountWayglassNativeVoice } from './surfaces/native-voice.js';
import { createWayglassSpectralField } from './spectral-field.js';
import { mountWayglassVideoAtelier } from './surfaces/video-atelier.js';
import { mountWayglassLivingObserver } from './surfaces/living-observer.js';
import { mountWayglassLibrarySurface } from './surfaces/library.js';
import { mountWayglassToybox } from './surfaces/toybox.js';
import { mountWayglassCommonsSurface } from './surfaces/commons.js';
import { mountWayglassAcousticRoom } from './surfaces/acoustic-room.js';
import {SHIP_DECK_GROUPS,shipDeckGroup,shipDeckMatches,shipDeckDestinationLabel} from './ship-deck-navigation.js';
import { mountWayglassQuadGestalt } from './surfaces/quad-eightfold.js';
import { installQuadFeatherListener, readLatestQuadGestalt, subscribeQuadGestalt } from './quad-eightfold-client.js';
import { publishWatercolorActivity } from './watercolor-bridge.js';
import { mountLivingWatercolorSurface } from './surfaces/living-watercolor.js';
import { mountJourneyBeforeDestinationSurface } from './surfaces/journey-before-destination.js';
import { WAYGLASS_ENTRY_SURFACE, resolveWayglassEntry } from './wayglass-entry.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { recordRouteAsWonderLight } from './wonder-light.js';
import { registerWayglassOrgan, listWayglassOrgans } from './organ-registry.js';
import { FIRST_WAYGLASS_ORGANS } from './organ-donors.js';

const root = document.querySelector('#app');

// Bluebird provider authorization is an explicit connection action.
// The local entry and other configured provider routes remain independently usable.
installWayglassField({ host: document.body });
installKeyboardControls({ root: document });

const embodiment = detectEmbodimentCapabilities(globalThis);
const ar = await detectARSupport(globalThis);
publishEmbodiment(embodiment, ar);
document.documentElement.dataset.wayglassKeyboard = embodiment.keyboard ? 'ready' : 'unavailable';
document.documentElement.dataset.wayglassAr = ar.supported ? 'ready' : ar.reason;

FIRST_WAYGLASS_ORGANS.forEach(registerWayglassOrgan);
const fullSpectrum = createWayglassSpectralField();

registerWayglassSurface({surface_id:'wayglass:sound-composition',label:'Wayglass · Spatial Soundstage',mount:root=>mountWayglassSoundComposition(root,{composition:wayglassSomaticSound.composition,soundscape:wayglassSomaticSound,storyBinding:wayglassStoryScoreBinding})});
registerWayglassSurface({surface_id:WAYGLASS_ENTRY_SURFACE,label:'Living Watercolor',mount:mountLivingWatercolorSurface});
registerWayglassSurface({surface_id:'wayglass:journey-before-destination',label:'Journey Before Destination',mount:mountJourneyBeforeDestinationSurface});

registerWayglassSurface({surface_id:'arcsweep:deck',label:'Wayglass · World and Continuity Deck',mount:mountArcSweepDeckSurface});

registerWayglassSurface({
  surface_id: 'arcsweep:writing-room',
  label: 'ArcSweep · Writing Room',
  mount: mountArcSweepWritingSurface,
});


registerWayglassSurface({
  surface_id:'wayglass:native-voice',
  label:'Wayglass · Wyrdrune Voice',
  mount:mountWayglassNativeVoice,
});

registerWayglassSurface({
  surface_id: 'wayglass:spectral-field',
  label: 'Wayglass · Full Spectrum',
  mount: root => mountWayglassSpectrumSurface(root,{field:fullSpectrum}),
});

registerWayglassSurface({
  surface_id: 'wayglass:systems',
  label: 'Wayglass · Organs',
  mount: mountWayglassSystemsSurface,
});

registerWayglassSurface({
  surface_id: 'wayglass:video-atelier',
  label: 'Wayglass · Video Atelier',
  mount: mountWayglassVideoAtelier,
});

registerWayglassSurface({
  surface_id: 'wayglass:commons',
  label: 'Wayglass · Commons',
  mount: mountWayglassCommonsSurface,
});

registerWayglassSurface({
  surface_id: 'wayglass:acoustic-room',
  label: 'Wayglass · Acoustic Room',
  mount: mountWayglassAcousticRoom,
});
registerWayglassSurface({
  surface_id: 'wayglass:quad-gestalt',
  label: 'Wayglass · Quad Möbius',
  mount: mountWayglassQuadGestalt,
});

subscribeWayglassObserver(recordRouteAsWonderLight);
installQuadFeatherListener();
subscribeQuadGestalt(reading=>{
  const observed=reading.evidence.filter(x=>x.status==='observed').length;
  if(observed===0)return;
  publishWatercolorActivity({kind:'fold:witness',actor:'wayglass:quad-host',
    receipt:{schema:reading.schema,receipt_id:reading.checkpoint_hash},
    intensity:Math.min(0.85,0.15+observed/reading.evidence.length*0.65),
    observedAt:reading.observed_at});
});


registerWayglassSurface({
  surface_id: 'wayglass:living-observer',
  label: 'Wayglass · Living Observer',
  mount: mountWayglassLivingObserver,
});

registerWayglassSurface({
  surface_id: 'wayglass:library',
  label: 'Wayglass · Research Library',
  mount: mountWayglassLibrarySurface,
});

registerWayglassSurface({
  surface_id: 'wayglass:toybox',
  label: 'Wayglass · Toybox',
  mount: mountWayglassToybox,
});

const browserEmbodiment = Object.freeze({
  body_id: 'browser-host',
  body_class: 'host-os',
  platform_hint: embodiment.platform_hint || null,
  keyboard: embodiment.keyboard,
  touch: embodiment.touch,
  ar: ar.supported,
  haptics: embodiment.vibration,
});

// The registry owns cleanup. Serialize requests so a quick room change cannot
// leave an earlier async surface subscribed after another room has mounted.
let mountQueue=Promise.resolve();
const spelling=createWayglassSpellingController({document});
const surfaces=listWayglassSurfaces();
const shell=document.createElement('nav');
shell.id='wg-shell-nav';shell.className='wg-shell-nav glass-panel';
shell.setAttribute('aria-label','Wayglass ship navigation');shell.hidden=true;
const deckHeading=document.createElement('div');deckHeading.className='wg-deck-heading';
deckHeading.innerHTML='<span class="wg-hud-kicker">WAYGLASS / NAVIGATION</span><strong>Choose your destination</strong><span class="tiny">Rooms are real working surfaces. No simulated route availability.</span>';
shell.append(deckHeading);
const deckSearch=document.createElement('input');
deckSearch.type='search';deckSearch.id='wg-deck-search';deckSearch.placeholder='Find a room…';
deckSearch.setAttribute('aria-label','Search Wayglass rooms');
deckSearch.autocomplete='off';shell.append(deckSearch);
const deckGroups=new Map();
for(const group of SHIP_DECK_GROUPS){
  const section=document.createElement('section');section.className='wg-deck-group';
  section.dataset.shipGroup=group.id;section.setAttribute('aria-label',group.name);
  const heading=document.createElement('div');heading.className='wg-deck-group-head';
  const name=document.createElement('strong');name.textContent=group.name;
  const description=document.createElement('span');description.textContent=group.description;
  heading.append(name,description);section.append(heading);shell.append(section);
  deckGroups.set(group.id,section);
}
for(const surface of surfaces){
  const button=document.createElement('button');button.type='button';button.className='glass-chip wg-deck-destination';
  button.dataset.surfaceId=surface.surface_id;button.dataset.destinationLabel=surface.label;
  button.textContent=surface.label;button.setAttribute('aria-pressed','false');
  deckGroups.get(shipDeckGroup(surface.surface_id)).append(button);
}
const deckEmpty=document.createElement('p');deckEmpty.className='tiny wg-deck-empty';
deckEmpty.textContent='No matching room. Try another name.';deckEmpty.hidden=true;shell.append(deckEmpty);
function filterDeck(search=deckSearch.value){
  let visible=0;
  for(const button of shell.querySelectorAll('[data-surface-id]')){
    const match=shipDeckMatches({label:button.dataset.destinationLabel,surface_id:button.dataset.surfaceId},search);
    button.hidden=!match;if(match)visible++;
  }
  for(const group of deckGroups.values())
    group.hidden=!group.querySelector('[data-surface-id]:not([hidden])');
  deckEmpty.hidden=visible!==0;
  return visible;
}
deckSearch.addEventListener('input',()=>filterDeck());
const connection=document.createElement('button');connection.type='button';connection.className='glass-chip';
connection.textContent='Connect Bluebird';connection.addEventListener('click',()=>{void openWayglassAuthorization();});shell.append(connection);
const spellingButton=document.createElement('button');spellingButton.type='button';spellingButton.className='glass-chip';
spellingButton.textContent='Spellcheck on';spellingButton.setAttribute('aria-pressed','true');
spellingButton.setAttribute('aria-label','Toggle native spellcheck for writing and messages');
spellingButton.addEventListener('click',()=>{
 const next=spelling.setEnabled(!spelling.enabled);
 spellingButton.textContent=next?'Spellcheck on':'Spellcheck off';
 spellingButton.setAttribute('aria-pressed',String(next));
});shell.append(spellingButton);
const switcher=document.createElement('button');switcher.type='button';switcher.className='wg-ship-switch glass-chip';
switcher.setAttribute('aria-controls',shell.id);switcher.setAttribute('aria-expanded','false');
switcher.setAttribute('aria-haspopup','true');switcher.textContent='Explore Wayglass';
const helm=document.createElement('header');helm.className='wg-helm glass-panel';
const helmIdentity=document.createElement('div');helmIdentity.className='wg-helm-identity';
const helmMark=document.createElement('span');helmMark.className='wg-helm-mark';helmMark.setAttribute('aria-hidden','true');helmMark.textContent='✧';
const helmTitle=document.createElement('div');helmTitle.className='wg-helm-title';
const helmName=document.createElement('strong');helmName.textContent='WAYGLASS';
const helmSubtitle=document.createElement('span');helmSubtitle.textContent='LIVING SHIP / ONE UNIVERSE';
helmTitle.append(helmName,helmSubtitle);helmIdentity.append(helmMark,helmTitle);
const helmReadout=document.createElement('div');helmReadout.className='wg-helm-readout';
const roomLabel=document.createElement('span');roomLabel.className='wg-helm-room';roomLabel.textContent='Arriving…';
const routeLabel=document.createElement('span');routeLabel.className='wg-helm-route';routeLabel.textContent='ROUTE / NO ACTIVITY OBSERVED';
routeLabel.setAttribute('aria-live','polite');routeLabel.setAttribute('role','status');
helmReadout.append(roomLabel,routeLabel);
const helmNav=document.createElement('button');helmNav.type='button';helmNav.className='glass-chip wg-helm-nav';
helmNav.textContent='⌘  Ship map';helmNav.setAttribute('aria-controls',shell.id);helmNav.setAttribute('aria-expanded','false');
helm.append(helmIdentity,helmReadout,helmNav);
root.before(helm);root.after(shell,switcher);
const motion=installMotionChoreography({root:document.documentElement,controlsHost:shell,contentRoot:root});
// A single semantic material signal can be projected into light, legible Wyrdrune
// inscriptions and opt-in cues without inventing an agent or a route receipt.
const faeberpunk=installFaeberpunkBridge({root:document.documentElement,inscriptionHost:helmReadout,soundscape:wayglassSomaticSound});
function setDeckOpen(open,{focus=false}={}){
  shell.hidden=!open;
  for(const control of [switcher,helmNav])control.setAttribute('aria-expanded',String(open));
  switcher.textContent=open?'Close ship map':'Explore Wayglass';
  if(open&&focus)deckSearch.focus();
  if(!open&&focus)helmNav.focus();
}
switcher.addEventListener('click',()=>setDeckOpen(shell.hidden,{focus:true}));
helmNav.addEventListener('click',()=>setDeckOpen(shell.hidden,{focus:true}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!shell.hidden){event.preventDefault();setDeckOpen(false,{focus:true});}
  else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();setDeckOpen(true,{focus:true});
  }
});
subscribeWayglassObserver(record=>{
  if(!record||!['started','completed','failed'].includes(record.status))return;
  routeLabel.textContent='ROUTE / '+record.status.toUpperCase()+(record.route_id?' · '+record.route_id:'');
  helm.dataset.routeState=record.status;
});
function mountSurface(surfaceId){
  const request=mountQueue.then(async()=>{
    const result=await mountWayglassSurface(surfaceId,root);
    fullSpectrum.setScope({room:surfaceId});
    fullSpectrum.capture({kind:'world',strength:.55,motion:.32,continuity:.82,intent:.65,
      source_ref:'wayglass:room-crossing'});
    spelling.apply(root);
    motion?.arrive(root);
    document.documentElement.dataset.wayglassSurface=surfaceId;
    roomLabel.textContent=shipDeckDestinationLabel(surfaceId,surfaces);
    // This is a completed local room mount, not a provider response or crossing.
    emitMaterialSignal({mode:'wake',strength:.65,intent:.5,handoff_progress:1,channel:'OOC'});
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:faeberpunk-cue',{detail:{kind:'chamber'}}));
    setDeckOpen(false);
    for(const button of shell.querySelectorAll('[data-surface-id]')){
      const active=button.dataset.surfaceId===surfaceId;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    }
    return result;
  });
  mountQueue=request.catch(()=>{});return request;
}
shell.addEventListener('click',event=>{const button=event.target.closest('[data-surface-id]');if(button)void mountSurface(button.dataset.surfaceId);});

const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  soundCompositionState:()=>{const s=wayglassSomaticSound.composition.snapshot();return Object.freeze({score_status:s.score_status,generating:s.generating,audio_enabled:s.audio_enabled,sequence:s.sequence,last_error:s.last_error,voice_count:s.layers.length,declared_context:wayglassStoryScoreBinding.getContext()!==null});},
  surfaces: listWayglassSurfaces,
  organs: listWayglassOrgans,
  quadGestalt: readLatestQuadGestalt,
  mount: mountSurface,
  connectBluebird: () => openWayglassAuthorization(),
  enter: ({ embodiment: entryEmbodiment = {}, ...entry } = {}) => enterWayglassWorld({
    ...entry,
    embodiment: { ...browserEmbodiment, ...entryEmbodiment },
  }).then(result=>{
    if(result?.entered){
      if(typeof entry.worldId==='string'){
        try{fullSpectrum.setScope({world:entry.worldId})}catch{/* entry receipt remains authoritative */}
      }
      fullSpectrum.capture({kind:'world',strength:.78,motion:.6,continuity:.9,intent:.85,
      source_ref:'wayglass:waygate-entry'});
    }
    return result;
  }),
  leave: ({ embodiment: departureEmbodiment = {}, ...departure } = {}) => leaveWayglassWorld({
    ...departure,
    embodiment: { ...browserEmbodiment, ...departureEmbodiment },
  }).then(result=>{
    if(result?.status==='stopped')fullSpectrum.capture({kind:'return',strength:.6,motion:.4,continuity:1,intent:.8,
      source_ref:'wayglass:return-engine'});
    return result;
  }),
  embodiment: Object.freeze({ ...embodiment, ar }),
  readMessages: readVoyageMessages,
  recoverDeparture: recoverWayglassDeparture,
  reply: replyToVoyage,
  doubleMobius: Object.freeze({ inspect: inspectWayglassDoubleMobius, traverse: traverseWayglassDoubleMobius }),
  fullSpectrum,
  faeberpunk:()=>faeberpunk?.snapshot(),
});

globalThis.__wayglassOS = wayglass;

const roomQuery=new URLSearchParams(globalThis.location?.search||'').get('room');
const entry=resolveWayglassEntry({available:listWayglassSurfaces(),room:roomQuery});
await wayglass.mount(entry.surface_id);
installVoyageInbox();
installWayglassStoryComposition({observe:subscribeWayglassObserver});
