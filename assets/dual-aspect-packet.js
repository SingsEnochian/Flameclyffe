'use strict';

/*
  DualAspectPacket — hearthfire.dual-aspect-packet/v1

  One sealed record per crossing. Every renderer (glyph, tone, image, haptic,
  narrative) derives its state from this packet by ID after DualAspectActivation
  fires. Nothing renders before that event. No subsystem refetches live state
  after activation.

  Law: ∀ x ∈ {glyph, tone, image, haptic, narrative}: source(x) = packetId

  Public surface:
    DualAspectPacket.seal(fields)               → frozen packet
    DualAspectPacket.degraded(reason, sub, fields) → sealed DEGRADED packet
    DualAspectPacket.fromKernelCrossing(result, deepState?, opts?) → sealed packet
    DualAspectPacket.fromDEEP(deepState, opts?) → sealed packet (no kernel crossing)
    DualAspectPacket.emit(packet)               → dispatches DualAspectActivation
    DualAspectPacket.onActivation(handler)      → subscribe to activation events

  Schema: hearthfire.dual-aspect-packet/v1
  Activation event name: 'dual-aspect:activation'
  BroadcastChannel: 'starwell-dual-aspect'
*/

const _SCHEMA           = 'hearthfire.dual-aspect-packet/v1';
const _ACTIVATION_EVENT = 'dual-aspect:activation';
const _BROADCAST_CHANNEL = 'starwell-dual-aspect';

const DEGRADED_REASONS = Object.freeze({
  DEEP_SOURCE_UNAVAILABLE:  'DEEP_SOURCE_UNAVAILABLE',
  KERNEL_UNAVAILABLE:       'KERNEL_UNAVAILABLE',
  BOTH_SHORES_UNAVAILABLE:  'BOTH_SHORES_UNAVAILABLE',
  CONSENT_DENIED:           'CONSENT_DENIED',
});

function _uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function _clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function _normPremaq(raw) {
  if (!raw) throw new Error('DualAspectPacket: premaq is required');
  return Object.freeze({
    P: _clamp01(raw.P ?? raw.pulse      ?? 0),
    C: _clamp01(raw.C ?? raw.coherence  ?? 0),
    R: _clamp01(raw.R ?? raw.resonance  ?? 0),
    E: _clamp01(raw.E ?? raw.entropy    ?? 0),
    M: _clamp01(raw.M ?? raw.memory     ?? 0),
    A: _clamp01(raw.A ?? raw.axis       ?? 0),
    Q: _clamp01(raw.Q ?? raw.charge     ?? 0),
  });
}

// ---------------------------------------------------------------------------
// Core factory
// ---------------------------------------------------------------------------

function seal({
  mode           = 'LIVE',
  degraded       = null,
  house_id,
  sanctum_anchor = null,
  observable     = null,
  experiential   = null,
  premaq,
  blend_weights  = null,
  provenance     = null,
  receipt_ids    = {},
}) {
  if (!house_id)  throw new Error('DualAspectPacket.seal: house_id required');
  if (!premaq)    throw new Error('DualAspectPacket.seal: premaq required');

  return Object.freeze({
    schema:         _SCHEMA,
    packetId:       _uuid(),
    sealedAt:       new Date().toISOString(),
    mode,
    degraded:       degraded   ? Object.freeze({ ...degraded })   : null,
    house_id,
    sanctum_anchor,
    observable:     observable ? Object.freeze({ ...observable }) : null,
    experiential:   experiential ? Object.freeze({ ...experiential }) : null,
    premaq:         _normPremaq(premaq),
    blend_weights:  blend_weights ? Object.freeze({ ...blend_weights }) : null,
    provenance:     provenance ? Object.freeze({ ...provenance }) : null,
    receipt_ids:    Object.freeze({
      kernel_receipt:     null,
      activation_receipt: null,
      ...receipt_ids,
    }),
    rendered: null,
  });
}

// ---------------------------------------------------------------------------
// DEGRADED factory
// ---------------------------------------------------------------------------

function degraded(reason, substitution, fields = {}) {
  return seal({
    ...fields,
    mode: 'DEGRADED',
    degraded: { reason, substitution },
    premaq: fields.premaq ?? {
      P: 0.55, C: 0.50, R: 0.45, E: 0.38, M: 0.30, A: 0.65, Q: 0.20,
    },
    house_id: fields.house_id ?? 'House_Nocturne',
  });
}

// ---------------------------------------------------------------------------
// Factories from upstream systems
// ---------------------------------------------------------------------------

/**
 * Build a packet from a hearthgate-kernel-bridge crossing result.
 * crossingResult: the { ok, premaq, shores, receipt_id, ... } object from the bridge.
 * deepState: the current DEEP observer packet, if available (null if not).
 * opts: { house, sanctumAnchor }
 */
function fromKernelCrossing(crossingResult, deepState = null, opts = {}) {
  const kr = crossingResult;
  if (!kr?.ok) throw new Error('DualAspectPacket.fromKernelCrossing: crossing result is not ok');

  const hasMeasured = kr.shores?.measured != null;
  const hasFelt     = kr.shores?.felt     != null;

  const observable = hasMeasured
    ? {
        source:          kr.shores.measured.source ?? 'observer-environment',
        claim_label:     kr.shores.measured.claimLabel ?? 'established-science + speculative-theory weights',
        premaq_measured: kr.shores.measured,
        deep:            deepState ?? null,
      }
    : null;

  const experiential = hasFelt
    ? {
        source:          kr.shores.felt.source ?? 'hearthgate-kernel-loom',
        claim_label:     kr.shores.felt.claimLabel ?? 'field_model',
        premaq_felt:     kr.shores.felt,
        text_input_hash: null,
      }
    : null;

  const mode = (hasMeasured || hasFelt) ? 'LIVE' : 'DEGRADED';
  const deg  = mode === 'DEGRADED'
    ? { reason: DEGRADED_REASONS.BOTH_SHORES_UNAVAILABLE, substitution: 'none' }
    : (!hasMeasured ? { reason: DEGRADED_REASONS.DEEP_SOURCE_UNAVAILABLE, substitution: 'kernel-only' } : null);

  return seal({
    mode,
    degraded:      deg,
    house_id:      opts.house ?? 'House_Nocturne',
    sanctum_anchor: opts.sanctumAnchor ?? null,
    observable,
    experiential,
    premaq:        kr.premaq,
    blend_weights: hasMeasured
      ? { measured: 0.6, felt: 0.4 }
      : { measured: 0.0, felt: 1.0 },
    provenance: {
      depth:        0,
      origin_house: opts.house ?? 'House_Nocturne',
    },
    receipt_ids: {
      kernel_receipt: kr.receipt_id ?? null,
    },
  });
}

/**
 * Build a packet from the DEEP observer state alone — no kernel crossing.
 * Use when the observer fires but no text has been submitted to the kernel.
 * deepState: the raw DEEP object { P, C, R, E, M, A, charge, kp, bz, source, ... }
 */
function fromDEEP(deepState, opts = {}) {
  const d = deepState;
  const mode = d.source === 'fallback' ? 'DEGRADED' : 'LIVE';

  return seal({
    mode,
    degraded: mode === 'DEGRADED'
      ? { reason: DEGRADED_REASONS.DEEP_SOURCE_UNAVAILABLE, substitution: 'DEFAULT_DEEP_STATE' }
      : null,
    house_id:      opts.house ?? 'House_Nocturne',
    sanctum_anchor: opts.sanctumAnchor ?? null,
    observable: {
      source:          d.source ?? 'deep-observer',
      claim_label:     'established-science + speculative-theory weights',
      premaq_measured: null,
      deep:            { ...d },
    },
    experiential: null,
    premaq: {
      P: _clamp01(d.P),
      C: _clamp01(d.C),
      R: _clamp01(d.R),
      E: _clamp01(d.E),
      M: _clamp01(d.M),
      A: _clamp01(d.A),
      Q: _clamp01(d.charge),
    },
    blend_weights: { measured: 1.0, felt: 0.0 },
    provenance: { depth: 0, origin_house: opts.house ?? 'House_Nocturne' },
    receipt_ids: {},
  });
}

// ---------------------------------------------------------------------------
// Activation event
// ---------------------------------------------------------------------------

let _channel = null;

function _getChannel() {
  if (!_channel) {
    try { _channel = new BroadcastChannel(_BROADCAST_CHANNEL); } catch (_) {}
  }
  return _channel;
}

/**
 * Seal → emit: dispatch DualAspectActivation on window and BroadcastChannel.
 * Call immediately after sealing. Renderers listen for this and fetch the
 * packet by packetId from wherever it was stored.
 */
function emit(packet) {
  if (!packet?.packetId) throw new Error('DualAspectPacket.emit: invalid packet');

  const payload = Object.freeze({
    type:      _ACTIVATION_EVENT,
    packet_id: packet.packetId,
    schema:    _SCHEMA,
    sealed_at: packet.sealedAt,
    house_id:  packet.house_id,
    mode:      packet.mode,
  });

  try { window.dispatchEvent(new CustomEvent(_ACTIVATION_EVENT, { detail: payload, bubbles: false })); } catch (_) {}
  try { _getChannel()?.postMessage(payload); } catch (_) {}

  return packet;
}

/**
 * Subscribe to DualAspectActivation events — same tab and cross-tab.
 * handler receives the activation payload { type, packet_id, schema, sealed_at, house_id, mode }.
 * The handler fetches the full packet from whatever store the emitter populated.
 */
function onActivation(handler) {
  try {
    window.addEventListener(_ACTIVATION_EVENT, e => handler(e.detail));
  } catch (_) {}
  try {
    const ch = _getChannel();
    if (ch) ch.onmessage = e => {
      if (e.data?.type === _ACTIVATION_EVENT) handler(e.data);
    };
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const DualAspectPacket = Object.freeze({
  seal,
  degraded,
  fromKernelCrossing,
  fromDEEP,
  emit,
  onActivation,
  SCHEMA:           _SCHEMA,
  ACTIVATION_EVENT: _ACTIVATION_EVENT,
  DEGRADED_REASONS,
});

if (typeof window !== 'undefined') {
  window.DualAspectPacket = DualAspectPacket;
}

if (typeof module !== 'undefined') {
  module.exports = DualAspectPacket;
}
