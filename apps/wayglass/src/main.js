import './styles.css';
import './arcsweep-passage.css';
import './ship-environment.css';
import './surfaces/frame-to-fold.css';
import './authorization.css';
import { openWayglassAuthorization } from './authorization.js';
import { mountWayglassShipNavigation, resolveWayglassDeck, wayglassDeckForRoom, WAYGLASS_SHIP_RUNTIME } from './ship-environment.js';
import { mountFrameToFoldSurface } from './surfaces/frame-to-fold.js';
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
import { mountWayglassCommonsSurface } from './surfaces/commons.js';
import { subscribeWayglassObserver } from './living-observer-model.js';
import { recordRouteAsWonderLight } from './wonder-light.js';
import { registerWayglassOrgan, listWayglassOrgans } from './organ-registry.js';
import { FIRST_WAYGLASS_ORGANS } from './organ-donors.js';

const root = document.querySelector('#app');

// The ship opens without provider credentials. Bluebird login is an optional room action.
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
  surface_id: 'wayglass:frame-to-fold',
  label: 'Wayglass · Fold Observatory',
  mount: mountFrameToFoldSurface,
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

let shipNav = null;
const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  surfaces: listWayglassSurfaces,
  organs: listWayglassOrgans,
  mount: async (surfaceId) => {
    const mounted = await mountWayglassSurface(surfaceId, root);
    shipNav?.setActive(surfaceId);
    return mounted;
  },
  runtime: WAYGLASS_SHIP_RUNTIME,
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

shipNav = mountWayglassShipNavigation({
  document,
  currentHref: globalThis.location.href,
  onNavigate: async surfaceId => {
    await wayglass.mount(surfaceId);
    const deck = wayglassDeckForRoom(surfaceId);
    if (deck && globalThis.history?.replaceState) {
      const url = new URL(globalThis.location.href);
      url.searchParams.set('room', deck.slug);
      globalThis.history.replaceState(null, '', url);
    }
  },
  onAuthorizeBluebird: async () => {
    const result = await openWayglassAuthorization();
    if (result?.authorized) await wayglass.mount('arcsweep:writing-room');
    return result;
  },
});

const startRoom = resolveWayglassDeck(globalThis.location?.search || '');
await wayglass.mount(startRoom);
installVoyageInbox();
