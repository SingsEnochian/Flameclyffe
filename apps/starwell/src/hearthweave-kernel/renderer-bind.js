/**
 * Step 3 — Renderer binding layer.
 *
 * After DualAspectActivation fires, every renderer (glyph, tone, image, haptic,
 * narrative) must derive its state from the frozen packet by ID. It may not
 * re-fetch live state independently after activation.
 *
 * Law: ∀ x ∈ {glyph, tone, image, haptic, narrative}: source(x) = packet_id
 *
 * Usage:
 *   import { onDualAspectActivation, getActivePacket } from './renderer-bind.js';
 *
 *   onDualAspectActivation((packet) => {
 *     if (!packet) { return; }  // deactivated — clear renderer state
 *     const { tone, glyph, haptic, visual, narrative } = packet.experiential;
 *     // render from frozen experiential state — do not re-fetch DEEP
 *   });
 */

import {
  DUAL_ASPECT_ACTIVATION_EVENT,
  DUAL_ASPECT_DEACTIVATION_EVENT,
} from './dual-aspect.js';
import { readActiveDualAspectPacket } from './activation.js';

const BROADCAST_CHANNEL_NAME = 'hearthweave:dual-aspect-broadcast';

let _activePacket = null;
const _handlers = new Set();

function _notify(packet) {
  for (const handler of _handlers) {
    try { handler(packet); } catch (_) {}
  }
}

function _onActivation() {
  const packet = readActiveDualAspectPacket({ storage: sessionStorage });
  _activePacket = packet;
  _notify(packet);
}

function _onDeactivation() {
  _activePacket = null;
  _notify(null);
}

if (typeof window !== 'undefined') {
  // Restore from sessionStorage on module load in case the page refreshed
  // after a prior activation (sessionStorage persists across same-tab navigations).
  _activePacket = readActiveDualAspectPacket({ storage: sessionStorage });

  window.addEventListener(DUAL_ASPECT_ACTIVATION_EVENT, _onActivation);
  window.addEventListener(DUAL_ASPECT_DEACTIVATION_EVENT, _onDeactivation);

  // Cross-tab: listen on BroadcastChannel for activations from other tabs
  // (they write to their own sessionStorage; we only receive the signal here,
  // not the packet — other tabs read their own sessionStorage on the event).
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === DUAL_ASPECT_ACTIVATION_EVENT)   _onActivation();
      if (event.data?.type === DUAL_ASPECT_DEACTIVATION_EVENT) _onDeactivation();
    };
  } catch (_) {}
}

/**
 * Subscribe to dual-aspect activation and deactivation.
 *
 * handler(packet) — called immediately if a packet is already active,
 *   then again on each subsequent activation or deactivation.
 *   packet is null on deactivation.
 *
 * Returns an unsubscribe function.
 */
export function onDualAspectActivation(handler) {
  _handlers.add(handler);
  // Replay current state to the new subscriber immediately.
  try { handler(_activePacket); } catch (_) {}
  return () => _handlers.delete(handler);
}

/**
 * Current active packet, or null if no activation has occurred.
 * Never call DEEP endpoints after receiving a non-null packet from here —
 * the experiential state in the packet IS the frozen source of truth.
 */
export function getActivePacket() {
  return _activePacket;
}

export { BROADCAST_CHANNEL_NAME };
