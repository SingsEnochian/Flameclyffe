import {
  CLAIM_STATES,
} from './dual-aspect.js';
import { validateDualAspectPacket } from './validation.js';
import {
  readActiveDualAspectPacket,
  recordDualAspectRender,
  subscribeToDualAspectActivation,
} from './activation.js';

export const RUNA_TONE_ACTIVATION_EVENT = 'runa:dual-aspect-tone-activation';
export const HEARTHWEAVE_HAPTIC_ACTIVATION_EVENT = 'hearthweave:haptic-activation';
export const HEARTHWEAVE_NARRATIVE_ACTIVATION_EVENT = 'hearthweave:narrative-activation';
export const SENSORY_ACTIVATION_KEY = 'hearthweave:sensory-activation:active:v1';
export const STALE_SENSORY_PACKET_CODE = 'HEARTHWEAVE_STALE_SENSORY_PACKET';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function dispatch(target, eventName, detail) {
  if (!target?.dispatchEvent) return;
  const EventClass = target.CustomEvent ?? globalThis.CustomEvent;
  if (typeof EventClass !== 'function') return;
  target.dispatchEvent(new EventClass(eventName, { detail }));
}

function writeActivation(storage, activation) {
  storage?.setItem?.(SENSORY_ACTIVATION_KEY, JSON.stringify(activation));
}

export function buildSensoryActivation(packetInput) {
  const packet = validateDualAspectPacket(packetInput);
  return {
    schema: 'hearthweave.sensory-activation/v1',
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    house_id: packet.identity.house_id,
    activated_at: packet.temporal.activated_at,
    degraded: clone(packet.degraded),
    tone: clone(packet.experiential.tone),
    haptic: clone(packet.experiential.haptic),
    narrative: clone(packet.experiential.narrative),
    visual: clone(packet.experiential.visual),
    acknowledgements: {
      tone: false,
      haptic: false,
      narrative: false,
    },
  };
}

export function publishSensoryActivation(packetInput, {
  storage = globalThis.sessionStorage,
  eventTarget = globalThis,
} = {}) {
  const packet = validateDualAspectPacket(packetInput);
  const activation = buildSensoryActivation(packet);
  writeActivation(storage, activation);

  dispatch(eventTarget, RUNA_TONE_ACTIVATION_EVENT, {
    packet_id: packet.packet_id,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    tone: clone(activation.tone),
    degraded: clone(packet.degraded),
    acknowledgement_required: true,
  });
  dispatch(eventTarget, HEARTHWEAVE_HAPTIC_ACTIVATION_EVENT, {
    packet_id: packet.packet_id,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    haptic: clone(activation.haptic),
    degraded: clone(packet.degraded),
    acknowledgement_required: true,
  });
  dispatch(eventTarget, HEARTHWEAVE_NARRATIVE_ACTIVATION_EVENT, {
    packet_id: packet.packet_id,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    narrative: clone(activation.narrative),
    degraded: clone(packet.degraded),
    acknowledgement_required: true,
  });

  recordDualAspectRender(packet, {
    renderer: 'tone',
    output: activation.tone,
    status: CLAIM_STATES.NOT_YET_TESTED,
    notes: ['Runa tone contract published from the shared packet; audible playback acknowledgement is pending.'],
    storage,
  });
  recordDualAspectRender(packet, {
    renderer: 'haptic',
    output: activation.haptic,
    status: CLAIM_STATES.NOT_YET_TESTED,
    notes: ['Paired call/answer haptic contract published; device acknowledgement is pending.'],
    storage,
  });
  recordDualAspectRender(packet, {
    renderer: 'narrative',
    output: activation.narrative,
    status: CLAIM_STATES.NOT_YET_TESTED,
    notes: ['Traveller/host narrative contract published; narrative consumer acknowledgement is pending.'],
    storage,
  });

  return clone(activation);
}

export function acknowledgeSensoryRender(packetInput, {
  renderer,
  output,
  notes = [],
  storage = globalThis.sessionStorage,
} = {}) {
  if (!['tone', 'haptic', 'narrative'].includes(renderer)) {
    throw new Error(`Unsupported sensory acknowledgement: ${renderer}`);
  }
  const packet = validateDualAspectPacket(packetInput);
  const activePacket = readActiveDualAspectPacket({ storage });
  if (
    !activePacket
    || activePacket.packet_id !== packet.packet_id
    || activePacket.packet_fingerprint !== packet.packet_fingerprint
  ) {
    throw new Error(`${STALE_SENSORY_PACKET_CODE}: sensory acknowledgement targets a packet that is no longer active`);
  }
  const active = JSON.parse(storage?.getItem?.(SENSORY_ACTIVATION_KEY) || 'null');
  if (!active || active.packet_id !== packet.packet_id) {
    throw new Error('Sensory acknowledgement does not match the active DualAspectPacket');
  }
  if (active.shared_state_fingerprint !== packet.correspondence.shared_state_fingerprint) {
    throw new Error('Sensory acknowledgement carries a divergent shared state');
  }
  active.acknowledgements[renderer] = true;
  writeActivation(storage, active);
  return recordDualAspectRender(packet, {
    renderer,
    output: output ?? active[renderer],
    status: CLAIM_STATES.VERIFIED,
    notes: ['Consumer acknowledged the packet-bound render.', ...notes],
    storage,
  });
}

export function installSensoryActivationBus({
  storage = globalThis.sessionStorage,
  eventTarget = globalThis,
} = {}) {
  return subscribeToDualAspectActivation(
    (packet) => publishSensoryActivation(packet, { storage, eventTarget }),
    { storage, eventTarget, emitCurrent: true },
  );
}

if (typeof window !== 'undefined' && !window.__HEARTHWEAVE_SENSORY_BUS__) {
  Object.defineProperty(window, '__HEARTHWEAVE_SENSORY_BUS__', {
    value: installSensoryActivationBus({ storage: sessionStorage, eventTarget: window }),
    configurable: true,
    enumerable: false,
    writable: false,
  });
}

export function getActiveSensoryActivation({ storage = globalThis.sessionStorage } = {}) {
  try {
    const packet = readActiveDualAspectPacket({ storage });
    const activation = JSON.parse(storage?.getItem?.(SENSORY_ACTIVATION_KEY) || 'null');
    if (!packet || !activation || activation.packet_id !== packet.packet_id) return null;
    return activation;
  } catch {
    return null;
  }
}

export function getPacketForSensoryAcknowledgement({ storage = globalThis.sessionStorage } = {}) {
  return readActiveDualAspectPacket({ storage });
}
