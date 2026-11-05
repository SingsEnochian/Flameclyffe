import './styles.css';
import { installWayglassField } from './glass-field.js';
import { installMotionChoreography } from './motion-choreography.js';
import { installKeyboardControls } from './keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport, publishEmbodiment } from './embodiment.js';
import { enterWayglassWorld, leaveWayglassWorld } from './route-client.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';
import { mountThoughtVibrationSurface } from './surfaces/thought-vibration.js';
import { mountLivingWatercolorSurface } from './surfaces/living-watercolor.js';
import { WAYGLASS_ENTRY_SURFACE, resolveWayglassEntry } from './wayglass-entry.js';
import { mountJourneyBeforeDestinationSurface } from './surfaces/journey-before-destination.js';

const root = document.querySelector('#app');

installWayglassField({ host: document.body });
installMotionChoreography({ root: document.documentElement });
installKeyboardControls({ root: document });

const embodiment = detectEmbodimentCapabilities(globalThis);
const ar = await detectARSupport(globalThis);
publishEmbodiment(embodiment, ar);
document.documentElement.dataset.wayglassKeyboard = embodiment.keyboard ? 'ready' : 'unavailable';
document.documentElement.dataset.wayglassAr = ar.supported ? 'ready' : ar.reason;

registerWayglassSurface({
  surface_id: WAYGLASS_ENTRY_SURFACE,
  label: 'Living Watercolor · Wayglass',
  mount: mountLivingWatercolorSurface,
});

registerWayglassSurface({
  surface_id: 'wayglass:journey-before-destination',
  label: 'Journey Before Destination',
  mount: mountJourneyBeforeDestinationSurface,
});

registerWayglassSurface({
  surface_id: 'arcsweep:writing-room',
  label: 'ArcSweep · Writing Room',
  mount: mountArcSweepWritingSurface,
});

registerWayglassSurface({
  surface_id: 'thought-vibration:operator',
  label: 'Thought Vibration · Mythiences Lab',
  mount: mountThoughtVibrationSurface,
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

const pinnedSpecialistReceipts = [];
let mountedSurface = null;

const surfaceNav = document.createElement('nav');
surfaceNav.className = 'wg-shell-nav glass-panel';
surfaceNav.setAttribute('aria-label', 'Explore Wayglass universe');
surfaceNav.hidden = true;
surfaceNav.innerHTML = listWayglassSurfaces().map((surface) =>
  '<button type="button" class="glass-chip" data-surface-id="' + surface.surface_id + '">' +
  surface.label +
  '</button>'
).join('');
root.after(surfaceNav);

const openShip = document.createElement('button');
openShip.type = 'button';
openShip.className = 'wg-ship-switch glass-chip';
openShip.setAttribute('aria-controls', 'wg-shell-nav');
openShip.setAttribute('aria-expanded', 'false');
openShip.textContent = 'Explore Wayglass';
surfaceNav.id = 'wg-shell-nav';
root.after(openShip);
openShip.addEventListener('click', () => {
  surfaceNav.hidden = !surfaceNav.hidden;
  openShip.setAttribute('aria-expanded', String(!surfaceNav.hidden));
  openShip.textContent = surfaceNav.hidden ? 'Explore Wayglass' : 'Close ship map';
});

async function mountSurface(surfaceId) {
  mountedSurface?.destroy?.();
  mountedSurface = await mountWayglassSurface(surfaceId, root);
  document.documentElement.dataset.wayglassSurface = surfaceId;
  // A chosen destination remains accessible, but the body remains the first
  // screen on every fresh visit. No persisted navigation silently skips her.
  surfaceNav.querySelectorAll('[data-surface-id]').forEach((button) => {
    const active = button.dataset.surfaceId === surfaceId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  return mountedSurface;
}

surfaceNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-surface-id]');
  if (!button) return;
  void mountSurface(button.dataset.surfaceId);
});

const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  surfaces: listWayglassSurfaces,
  mount: mountSurface,
  enter: ({ embodiment: entryEmbodiment = {}, ...entry } = {}) => enterWayglassWorld({
    ...entry,
    embodiment: { ...browserEmbodiment, ...entryEmbodiment },
  }),
  leave: async ({
    embodiment: departureEmbodiment = {},
    thoughtVibrationReceipts = null,
    ...departure
  } = {}) => {
    const usingPinned = thoughtVibrationReceipts == null;
    const specialistReceipts = usingPinned
      ? [...pinnedSpecialistReceipts]
      : thoughtVibrationReceipts;
    const result = await leaveWayglassWorld({
      ...departure,
      thoughtVibrationReceipts: specialistReceipts,
      embodiment: { ...browserEmbodiment, ...departureEmbodiment },
    });
    if (usingPinned && result?.status === 'stopped') pinnedSpecialistReceipts.splice(0);
    return result;
  },
  pinSpecialistReceipt(receipt) {
    if (!receipt || receipt.schema !== 'thought-vibration.receipt/v1') return false;
    const digest = receipt.wave_file_sha256 || receipt.input_file_sha256 || JSON.stringify(receipt);
    const exists = pinnedSpecialistReceipts.some((item) =>
      (item.wave_file_sha256 || item.input_file_sha256 || JSON.stringify(item)) === digest
    );
    if (!exists) pinnedSpecialistReceipts.push(receipt);
    if (pinnedSpecialistReceipts.length > 12) pinnedSpecialistReceipts.splice(0, pinnedSpecialistReceipts.length - 12);
    return true;
  },
  specialistReceipts: () => Object.freeze([...pinnedSpecialistReceipts]),
  clearSpecialistReceipts: () => pinnedSpecialistReceipts.splice(0),
  embodiment: Object.freeze({ ...embodiment, ar }),
});

globalThis.__wayglassOS = wayglass;

const entry = resolveWayglassEntry({ available: listWayglassSurfaces() });
await wayglass.mount(entry.surface_id);
