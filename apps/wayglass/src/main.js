import './styles.css';
import './futuristic-motion.css';
import { installEightfoldObserver } from './eightfold-observer.js';
import { createInstrumentBus } from './instrument-bus.js';
import { installWayglassField } from './glass-field.js';
import { installMotionChoreography } from './motion-choreography.js';
import { installKeyboardControls } from './keyboard-controls.js';
import { detectEmbodimentCapabilities, detectARSupport, publishEmbodiment } from './embodiment.js';
import { enterWayglassWorld, leaveWayglassWorld } from './route-client.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';
import { mountThoughtVibrationSurface } from './surfaces/thought-vibration.js';

const root = document.querySelector('#app');
const instrumentBus = createInstrumentBus();

installWayglassField({ host: document.body });
installMotionChoreography({ root: document.documentElement });
installKeyboardControls({ root: document });

const embodiment = detectEmbodimentCapabilities(globalThis);
const ar = await detectARSupport(globalThis);
publishEmbodiment(embodiment, ar);
document.documentElement.dataset.wayglassKeyboard = embodiment.keyboard ? 'ready' : 'unavailable';
document.documentElement.dataset.wayglassAr = ar.supported ? 'ready' : ar.reason;

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
surfaceNav.setAttribute('aria-label', 'Wayglass surfaces');
surfaceNav.innerHTML = listWayglassSurfaces().map((surface) =>
  '<button type="button" class="glass-chip" data-surface-id="' + surface.surface_id + '">' +
  surface.label +
  '</button>'
).join('');
root.before(surfaceNav);
installEightfoldObserver({ root, bus: instrumentBus });
globalThis.addEventListener('wayglass:material-wake', (event) => {
  const detail = event.detail || {};
  instrumentBus.publish('Resonance', {
    source: 'material-state',
    description: 'Local UI signal: ' + String(detail.mode || 'wake') + ', strength ' + Number(detail.strength || 0).toFixed(2) + '. Not a physical resonance measurement.',
  });
});
for (const [kind, source, description] of [
  ['Cosmology', 'dataset-adapter', 'No astronomical dataset admitted.'],
  ['Numerology', 'symbolic-adapter', 'Symbolic analysis awaits source and method.'],
  ['Wonder', 'question-adapter', 'No sourced unresolved question admitted.'],
]) instrumentBus.publish(kind, { source, description, status: 'unconnected' });

async function mountSurface(surfaceId) {
  mountedSurface?.destroy?.();
  mountedSurface = await mountWayglassSurface(surfaceId, root);
  instrumentBus.publish('Observation', { source: 'surface-registry', description: 'Mounted ' + surfaceId });
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
  enter: async ({ embodiment: entryEmbodiment = {}, ...entry } = {}) => {
    const result = await enterWayglassWorld({ ...entry, embodiment: { ...browserEmbodiment, ...entryEmbodiment } });
    instrumentBus.publish('Continuity', {
      source: 'kernel-enter',
      status: result?.entered === true ? 'observed' : 'pending',
      description: 'World entry: ' + String(result?.status || 'unknown'),
      reference: String(result?.continuation_packet?.packet_id || ''),
    });
    return result;
  },
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
    instrumentBus.publish('Continuity', {
      source: 'kernel-leave',
      status: result?.status === 'stopped' ? 'observed' : 'pending',
      description: 'World departure: ' + String(result?.status || 'unknown'),
      reference: String(result?.stop_receipt?.receipt_id || ''),
    });
    if (result?.stop_receipt?.receipt_id) instrumentBus.publish('Provenance', {
      source: 'kernel-stop-receipt',
      description: 'Kernel returned a stop receipt.',
      reference: String(result.stop_receipt.receipt_id),
    });
    return result;
  },
  pinSpecialistReceipt(receipt) {
    if (!receipt || receipt.schema !== 'thought-vibration.receipt/v1') return false;
    const digest = receipt.wave_file_sha256 || receipt.input_file_sha256 || JSON.stringify(receipt);
    const exists = pinnedSpecialistReceipts.some((item) =>
      (item.wave_file_sha256 || item.input_file_sha256 || JSON.stringify(item)) === digest
    );
    if (!exists) {
      pinnedSpecialistReceipts.push(receipt);
      instrumentBus.publish('Provenance', {
        source: 'specialist-receipt',
        description: 'Locally pinned specialist receipt; not canon authority.',
        reference: String(receipt.wave_file_sha256 || receipt.input_file_sha256 || ''),
      });
    }
    if (pinnedSpecialistReceipts.length > 12) pinnedSpecialistReceipts.splice(0, pinnedSpecialistReceipts.length - 12);
    return true;
  },
  specialistReceipts: () => Object.freeze([...pinnedSpecialistReceipts]),
  instrumentEvidence: (kind) => instrumentBus.recent(kind),
  clearSpecialistReceipts: () => pinnedSpecialistReceipts.splice(0),
  embodiment: Object.freeze({ ...embodiment, ar }),
});

globalThis.__wayglassOS = wayglass;

await wayglass.mount('arcsweep:writing-room');
