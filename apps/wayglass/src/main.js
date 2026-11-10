import './styles.css';
import {wayglassTimer,wayglassPerformanceSnapshot,observeWayglassTiming} from './performance-diagnostics.js';
import './authorization.css';
import { openWayglassAuthorization } from './authorization.js';
import { installWayglassField } from './glass-field.js';
import { installMotionChoreography } from './motion-choreography.js';
import { installKeyboardControls } from './keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport, publishEmbodiment } from './embodiment.js';
import { enterWayglassWorld, leaveWayglassWorld, recoverWayglassDeparture, readVoyageMessages, replyToVoyage } from './route-client.js';
import { installVoyageInbox } from './voyage-inbox.js';
import { createWayglassSpellingController } from './spelling-assistance.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';
import { mountWayglassSystemsSurface } from './surfaces/systems.js';
import { mountWayglassVideoAtelier } from './surfaces/video-atelier.js';
import { mountWayglassLivingObserver } from './surfaces/living-observer.js';
import { mountWayglassLibrarySurface } from './surfaces/library.js';
import { mountWayglassToybox } from './surfaces/toybox.js';
import { mountWayglassCommonsSurface } from './surfaces/commons.js';
import { mountWayglassAcousticRoom } from './surfaces/acoustic-room.js';
import { mountLivingWatercolorSurface } from './surfaces/living-watercolor.js';
import { mountJourneyBeforeDestinationSurface } from './surfaces/journey-before-destination.js';
import { WAYGLASS_ENTRY_SURFACE, resolveWayglassEntry } from './wayglass-entry.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { recordRouteAsWonderLight } from './wonder-light.js';
import { registerWayglassOrgan, listWayglassOrgans } from './organ-registry.js';
import { FIRST_WAYGLASS_ORGANS } from './organ-donors.js';

const bootFinished=wayglassTimer('boot:entry-ready');
const root = document.querySelector('#app');

// Bluebird provider authorization is an explicit connection action.
// The local entry and other configured provider routes remain independently usable.
installWayglassField({ host: document.body });
installMotionChoreography({ root: document.documentElement });
installKeyboardControls({ root: document });

const embodiment = detectEmbodimentCapabilities(globalThis);
const ar = await detectARSupport(globalThis);
publishEmbodiment(embodiment, ar);
document.documentElement.dataset.wayglassKeyboard = embodiment.keyboard ? 'ready' : 'unavailable';
document.documentElement.dataset.wayglassAr = ar.supported ? 'ready' : ar.reason;

FIRST_WAYGLASS_ORGANS.forEach(registerWayglassOrgan);

registerWayglassSurface({surface_id:WAYGLASS_ENTRY_SURFACE,label:'Living Watercolor',mount:mountLivingWatercolorSurface});
registerWayglassSurface({surface_id:'wayglass:journey-before-destination',label:'Journey Before Destination',mount:mountJourneyBeforeDestinationSurface});

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

registerWayglassSurface({
  surface_id: 'wayglass:acoustic-room',
  label: 'Wayglass · Acoustic Room',
  mount: mountWayglassAcousticRoom,
});

subscribeWayglassObserver(recordRouteAsWonderLight);

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
const shell=document.createElement('nav');
shell.id='wg-shell-nav';shell.className='wg-shell-nav glass-panel';
shell.setAttribute('aria-label','Explore Wayglass');shell.hidden=true;
for(const surface of listWayglassSurfaces()){
  const button=document.createElement('button');button.type='button';button.className='glass-chip';
  button.dataset.surfaceId=surface.surface_id;button.textContent=surface.label;shell.append(button);
}
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
switcher.setAttribute('aria-controls',shell.id);switcher.setAttribute('aria-expanded','false');switcher.textContent='Explore Wayglass';
root.after(shell,switcher);
switcher.addEventListener('click',()=>{shell.hidden=!shell.hidden;switcher.setAttribute('aria-expanded',String(!shell.hidden));switcher.textContent=shell.hidden?'Explore Wayglass':'Close ship map';});
function mountSurface(surfaceId){
  const request=mountQueue.then(async()=>{
    const endMount=wayglassTimer('room:mount:'+surfaceId);
    let result;
    try { result=await mountWayglassSurface(surfaceId,root); }
    finally { endMount(); }
    spelling.apply(root);
    document.documentElement.dataset.wayglassSurface=surfaceId;
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
  surfaces: listWayglassSurfaces,
  organs: listWayglassOrgans,
  mount: mountSurface,
  connectBluebird: () => openWayglassAuthorization(),
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
// Browser-local, metadata-only timings. Accessible from DevTools:
// __wayglassPerformance(). No transcripts, credentials or network telemetry.
globalThis.__wayglassPerformance = wayglassPerformanceSnapshot;

const roomQuery=new URLSearchParams(globalThis.location?.search||'').get('room');
const entry=resolveWayglassEntry({available:listWayglassSurfaces(),room:roomQuery});
await wayglass.mount(entry.surface_id);
bootFinished();
// Navigation-origin to first Wayglass room readiness includes module loading.
if(Number.isFinite(globalThis.performance?.now?.()))observeWayglassTiming('boot:navigation-to-ready',globalThis.performance.now());
installVoyageInbox();
