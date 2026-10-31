import './styles.css';
import './authorization.css';
import './ship-wide-hud.css';
import './liquid-optical-materials.css';
import './ship-bridge-console.css';
import { createShipKernel } from './ship-kernel.js';
import { createVesselEcology } from './vessel-ecology.js';
import { mountShipBridgeConsole } from './ship-bridge-console.js';
import { createShipSoundDesk } from './ship-sound.js';
import { detectEmbodiedAccess } from './embodiment-guard.js';
import { installShipDeck } from './ship-deck.js';
import { openWayglassAuthorization } from './authorization.js';
import { installWayglassField } from './glass-field.js';
import { installMotionChoreography } from './motion-choreography.js';
import { installKeyboardControls } from './keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport, publishEmbodiment } from './embodiment.js';
import { enterWayglassWorld, leaveWayglassWorld, recoverWayglassDeparture, readVoyageMessages, replyToVoyage } from './route-client.js';
import { installVoyageInbox } from './voyage-inbox.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';
import { mountWayglassSystemsSurface } from './surfaces/systems.js';
import { mountWayglassVideoAtelier } from './surfaces/video-atelier.js';
import { mountWayglassLivingObserver } from './surfaces/living-observer.js';
import { mountWayglassLibrarySurface } from './surfaces/library.js';
import { mountWayglassToybox } from './surfaces/toybox.js';
import { mountNikolaResearchSurface } from './surfaces/nikola-lab.js';
import { mountWayglassCommonsSurface } from './surfaces/commons.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { recordRouteAsWonderLight, subscribeWonderLight } from './wonder-light.js';
import { registerWayglassOrgan, listWayglassOrgans } from './organ-registry.js';
import { FIRST_WAYGLASS_ORGANS } from './organ-donors.js';

const root = document.querySelector('#app');

// A browser's local/owner-safe Wayglass surfaces must mount without
// requiring a third-party participant's credential. Bluebird's session is
// deliberately opt-in and still required by his protected provider actions.
// A page restored from bfcache has no implicit provider reauthorisation.

installWayglassField({ host: document.body });
installMotionChoreography({ root: document.documentElement });
installKeyboardControls({ root: document });

const embodiment = detectEmbodimentCapabilities(globalThis);
const ar = await detectARSupport(globalThis);
publishEmbodiment(embodiment, ar);
document.documentElement.dataset.wayglassKeyboard = embodiment.keyboard ? 'ready' : 'unavailable';
document.documentElement.dataset.wayglassAr = ar.supported ? 'ready' : ar.reason;

FIRST_WAYGLASS_ORGANS.forEach(registerWayglassOrgan);

registerWayglassSurface({
  surface_id: 'arcsweep:writing-room',
  label: 'ArcSweep · Writing Room',
  mount: mountArcSweepWritingSurface,
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

subscribeWayglassObserver(recordRouteAsWonderLight);
// Explicit transport observations drive the visible ship comms annunciator;
// text, private contents and relationships never enter the bridge kernel.
subscribeWayglassObserver(sample=>shipKernel.route({status:sample.status,routeId:sample.route_id}));

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

registerWayglassSurface({
  surface_id: 'wayglass:nikola-research',
  label: 'Nikola · Research Observatory',
  mount: mountNikolaResearchSurface,
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

const soundDesk=createShipSoundDesk();
const vesselEcology=createVesselEcology();
const embodiedAccess=detectEmbodiedAccess();
let disposeBridge=null,disposeDeckGestures=null;
const shipKernel=createShipKernel({
  mount:async surfaceId=>{
    disposeBridge?.();disposeBridge=null;
    disposeDeckGestures?.();disposeDeckGestures=null;
    try{
      const result=await mountWayglassSurface(surfaceId,root);
      disposeDeckGestures=installShipDeck(root,surfaceId,target=>shipKernel.navigate(target));
      disposeBridge=mountShipBridgeConsole(root,shipKernel,surfaceId,soundDesk,vesselEcology);
      return result;
    }catch(error){
      // Failure is visible. Never silently switch worlds, retry providers,
      // create synthetic messages or reload and lose a draft.
      root.replaceChildren();
      const notice=document.createElement('section');
      notice.className='wg-surface wg-ship-fault';
      const h=document.createElement('h1');h.textContent='Bridge deck failed to mount';
      const p=document.createElement('p');
      p.textContent=String(error?.message||error).slice(0,240);
      const retry=document.createElement('button');
      retry.type='button';retry.textContent='Retry this deck';
      retry.addEventListener('click',()=>{void shipKernel.navigate(surfaceId,{recovery:true}).catch(()=>{});});
      notice.append(h,p,retry);root.append(notice);
      throw error;
    }
  },
  storage:globalThis.localStorage
});
// Vessel-wide process: bounded source events, deterministic local dynamics,
// no external action, participant inference or cross-session identity claim.
let lifeSequence=0;
const lifeObserve=(kind,source_ref,event_id=null)=>vesselEcology.observe({
  kind,source_ref,event_id:event_id||'ship-event:'+ ++lifeSequence
});
let lastLifeDeck=null,lastLifeRoute=null,lastLifeHost='unchecked';
shipKernel.subscribe(reading=>{
  if(reading.frame==='settled'&&reading.deck&&reading.deck!==lastLifeDeck){
    lastLifeDeck=reading.deck;
    lifeObserve('deck-settled','ship-kernel:deck');
  }
  const routeKey=reading.route+':'+reading.route_status;
  if(['started','completed','failed'].includes(reading.route_status)&&routeKey!==lastLifeRoute){
    lastLifeRoute=routeKey;
    lifeObserve('route-'+reading.route_status,'ship-kernel:route');
  }
  if(reading.host!==lastLifeHost){
    lastLifeHost=reading.host;
    if(reading.host==='responding')lifeObserve('host-responding','ship-kernel:host');
    if(reading.host==='unavailable')lifeObserve('host-unavailable','ship-kernel:host');
  }
});
subscribeWonderLight(event=>{
 if(event?.kind==='wonder-open')lifeObserve('wonder-open','wonder-light:question',
  'wonder-event:'+String(event.event_id).slice(0,100));
});
globalThis.addEventListener?.('wayglass:feather',event=>{
 lifeObserve(event?.detail?.held===true?'feather-held':'feather-released','wayglass-ui:feather');
});
// A visible browser can advance the local visual process; inactive tabs do not
// accumulate invented elapsed time or infer biological sleep.
globalThis.setInterval?.(()=>{
 if(document.visibilityState!=='hidden')vesselEcology.step(3);
},3000);
const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  surfaces: listWayglassSurfaces,
  organs: listWayglassOrgans,
  mount: surfaceId=>shipKernel.navigate(surfaceId),
  get ship(){return shipKernel.state;},
  get vesselDynamics(){return vesselEcology.snapshot();},
  shipHealth:()=>shipKernel.health(),
  shipTheme:name=>shipKernel.theme(name),
  get sound(){return soundDesk.snapshot();},
  get embodiedAccess(){return embodiedAccess;},
  authorizeBluebird: () => openWayglassAuthorization(),
  enter: ({ embodiment: entryEmbodiment = {}, ...entry } = {}) => enterWayglassWorld({
    ...entry,
    embodiment: { ...browserEmbodiment, ...entryEmbodiment },
  }),
  leave: ({ embodiment: departureEmbodiment = {}, ...departure } = {}) => leaveWayglassWorld({
    ...departure,
    embodiment: { ...browserEmbodiment, ...departureEmbodiment },
  }),
  embodiment: Object.freeze({ ...embodiment, ar }),
  readMessages: readVoyageMessages,
  recoverDeparture: recoverWayglassDeparture,
  reply: replyToVoyage,
});

globalThis.__wayglassOS = wayglass;

const roomQuery = new URLSearchParams(globalThis.location?.search || '').get('room');
const startRoom = roomQuery === 'nikola' ? 'wayglass:nikola-research'
  : roomQuery === 'observer' ? 'wayglass:living-observer'
  : roomQuery === 'library' ? 'wayglass:library'
  : roomQuery === 'toybox' ? 'wayglass:toybox'
  : roomQuery === 'organs' ? 'wayglass:systems'
  : roomQuery === 'video' ? 'wayglass:video-atelier'
  : roomQuery === 'commons' ? 'wayglass:commons'
  : 'arcsweep:writing-room';
await wayglass.mount(startRoom);
installVoyageInbox();
