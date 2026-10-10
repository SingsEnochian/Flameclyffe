import './styles.css';
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
import { mountWayglassCommonsSurface } from './surfaces/commons.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { recordRouteAsWonderLight } from './wonder-light.js';
import { registerWayglassOrgan, listWayglassOrgans } from './organ-registry.js';
import { FIRST_WAYGLASS_ORGANS } from './organ-donors.js';

const root = document.querySelector('#app');

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

registerWayglassSurface({
  surface_id: 'wayglass:living-observer',
  label: 'Wayglass · Living Observer',
  mount: mountWayglassLivingObserver,
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

const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  surfaces: listWayglassSurfaces,
  organs: listWayglassOrgans,
  mount: (surfaceId) => mountWayglassSurface(surfaceId, root),
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
const startRoom = roomQuery === 'observer' ? 'wayglass:living-observer'
  : roomQuery === 'organs' ? 'wayglass:systems'
  : roomQuery === 'video' ? 'wayglass:video-atelier'
  : 'arcsweep:writing-room';
await wayglass.mount(startRoom);
installVoyageInbox();
