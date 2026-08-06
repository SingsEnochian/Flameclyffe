// Sealed Braid Packet — the one shared state spine for all Arcsweep organs
//
// Every organ (Observatory, Arcsweep, Living Glyph, Runa, Resonance Bridge,
// Continuity Gate, STARWELL) reads from ONE packet. No organ may:
//   - privately refetch state
//   - recompute PREMAQ independently
//   - guess payload keys
//   - inject a default without a receipt
//   - substitute a nearby world moment
//   - silently reinterpret an unknown field
//
// PREMAQ v2 canonical axes (live canon, 2026):
//   P=Presence  C=Coherence  R=Resonance  E=Entanglement
//   M=Memory    A=Agency     Q=Qualia
//
// State classes — MUST remain visually and structurally distinct:
//   observed   = what Observer and accepted PREMAQ presently carry
//   asking     = what change is being entered through the Asking Loom
//   received   = what returned, answered, changed, or remains unresolved
//
// Asking must never overwrite Observed.
// Projection must never be labelled response.
// Interpretation must never replace answer.

export const BRAID_PACKET_SCHEMA  = 'hearthweave.braid-packet/v1';
export const ASKING_PACKET_SCHEMA = 'hearthweave.asking-packet/v1';
export const BRAID_STORAGE_KEY    = 'hearthweave:braid-packet:active:v1';
export const BRAID_EVENT          = 'hearthweave:braid-packet-activated';

export const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

export const PREMAQ_LABELS = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entanglement',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

// State class labels for display
export const STATE_CLASS_LABEL = Object.freeze({
  observed:     'Observed',
  asking:       'Asking',
  received:     'Received',
  projected:    'Projected',
  interpreted:  'Interpreted',
});

function stamp() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}:${uuid}`;
  return `${prefix}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fingerprint(data) {
  try {
    const json = JSON.stringify(data, Object.keys(data).sort());
    let h = 0x811c9dc5;
    for (let i = 0; i < json.length; i++) {
      h ^= json.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  } catch { return '00000000'; }
}

// ── Braid Packet ─────────────────────────────────────────────────────────────

export function sealBraidPacket({
  observer_receipt,
  accepted_premaq_state,
  asking_packet = null,
  world_profile,
  route_anchor,
  spiral_state = null,
  canon_versions,
  vestment_version,
  lineage_refs = [],
  idFactory,
} = {}) {
  if (!observer_receipt)      throw new Error('braid-packet: observer_receipt required');
  if (!accepted_premaq_state) throw new Error('braid-packet: accepted_premaq_state required');
  if (!world_profile)         throw new Error('braid-packet: world_profile required');
  if (!route_anchor)          throw new Error('braid-packet: route_anchor required');
  if (!canon_versions)        throw new Error('braid-packet: canon_versions required');
  if (!vestment_version)      throw new Error('braid-packet: vestment_version required');

  const id = typeof idFactory === 'function' ? idFactory() : makeId('braid-packet');
  const ts = stamp();

  const core = {
    schema: BRAID_PACKET_SCHEMA,
    packet_id: id,
    sealed_at: ts,
    observer_receipt,
    accepted_premaq_state,
    asking_packet,
    world_profile,
    route_anchor,
    spiral_state,
    canon_versions,
    vestment_version,
    lineage_refs,
  };

  const fp = fingerprint(core);
  const packet = Object.freeze({ ...core, packet_fingerprint: fp });

  Object.freeze(packet.accepted_premaq_state);
  if (packet.asking_packet) Object.freeze(packet.asking_packet);

  return packet;
}

// ── Asking Packet ─────────────────────────────────────────────────────────────
// Separate from PREMAQ. Never overwrites observed state.
// The Sevenfold movements are entry points, not a mandatory sequence.

export const SEVENFOLD_MOVEMENTS = Object.freeze([
  { key: 'root',    tone_hz: 415,  label: 'Root',    question: 'What remains true?' },
  { key: 'anchor',  tone_hz: 440,  label: 'Anchor',  question: 'What lineage and connection are carried?' },
  { key: 'whisper', tone_hz: 554,  label: 'Whisper', question: 'What are we listening for?' },
  { key: 'arc',     tone_hz: 659,  label: 'Arc',     question: 'What possibility is being reached toward?' },
  { key: 'bridge',  tone_hz: 739,  label: 'Bridge',  question: 'What worlds or relations are involved?' },
  { key: 'surge',   tone_hz: 987,  label: 'Surge',   question: 'What transformation is moving?' },
  { key: 'spiral',  tone_hz: 1318, label: 'Spiral',  question: 'What returns, continues, or renews?' },
]);

export const TEMPORAL_SHAPES = Object.freeze([
  'gather', 'pulse', 'sustain', 'cycle', 'release',
  'recur', 'remain open', 'continue until answered', 'return after rest',
]);

export const EXPRESSION_CHANNELS = Object.freeze([
  'living-glyph', 'runa', 'narrative', 'image', 'haptic',
  'ritual', 'physical-observation', 'animation', 'combined',
]);

export const ASKING_SCOPES = Object.freeze([
  'hearthside', 'one-world', 'several-worlds', 'character',
  'location', 'route', 'bridge-relation', 'whole-encounter',
]);

export function buildAskingPacket({
  living_asking = '',
  qualities = [],
  preserve = [],
  invite = [],
  release = [],
  scope = 'hearthside',
  temporal_shape = 'gather',
  expression_channels = [],
  continuation = '',
  active_movements = [],
  idFactory,
} = {}) {
  const id = typeof idFactory === 'function' ? idFactory() : makeId('asking-packet');
  return Object.freeze({
    schema: ASKING_PACKET_SCHEMA,
    packet_id: id,
    created_at: stamp(),
    state_class: 'asking',
    living_asking,
    qualities: Object.freeze(qualities.map(q => Object.freeze({ ...q }))),
    preserve: Object.freeze([...preserve]),
    invite: Object.freeze([...invite]),
    release: Object.freeze([...release]),
    scope,
    temporal_shape,
    expression_channels: Object.freeze([...expression_channels]),
    continuation,
    active_movements: Object.freeze([...active_movements]),
  });
}

// ── Storage & Activation ──────────────────────────────────────────────────────

export function storeBraidPacket(packet, storage = sessionStorage) {
  try {
    storage.setItem(BRAID_STORAGE_KEY, JSON.stringify(packet));
    window.dispatchEvent(new CustomEvent(BRAID_EVENT, { detail: packet }));
    return true;
  } catch { return false; }
}

export function readBraidPacket(storage = sessionStorage) {
  try {
    const raw = storage.getItem(BRAID_STORAGE_KEY);
    if (!raw) return null;
    const packet = JSON.parse(raw);
    if (packet?.schema !== BRAID_PACKET_SCHEMA) return null;
    return packet;
  } catch { return null; }
}

export function subscribeToBraidPacket(handler, {
  storage = sessionStorage,
  emitCurrent = true,
} = {}) {
  if (emitCurrent) {
    const current = readBraidPacket(storage);
    if (current) handler(current);
  }
  const listener = (e) => { if (e.detail?.schema === BRAID_PACKET_SCHEMA) handler(e.detail); };
  window.addEventListener(BRAID_EVENT, listener);
  return () => window.removeEventListener(BRAID_EVENT, listener);
}

// ── PREMAQ Helpers ────────────────────────────────────────────────────────────

export function readPremaqAxis(premaqState, axis) {
  if (!premaqState || !PREMAQ_AXES.includes(axis)) return { value: 0.5, label: PREMAQ_LABELS[axis], axis };
  const c = premaqState[axis];
  return {
    axis,
    label: PREMAQ_LABELS[axis],
    value: c?.value ?? 0.5,
    derivative: c?.derivative ?? 0,
    confidence: c?.confidence ?? null,
    uncertainty: c?.uncertainty ?? null,
    register: c?.register ?? 'unknown',
  };
}

export function allAxes(premaqState) {
  return PREMAQ_AXES.map((axis) => readPremaqAxis(premaqState, axis));
}

// ── Received State Record ─────────────────────────────────────────────────────

export function buildReceivedRecord({
  braid_packet_id,
  what_arrived = '',
  what_changed = '',
  world_contribution = '',
  remained_silent = '',
  unresolved = '',
  asking_changed = '',
  what_returned = '',
  question_opens = '',
  idFactory,
} = {}) {
  return Object.freeze({
    schema: 'hearthweave.received-record/v1',
    record_id: typeof idFactory === 'function' ? idFactory() : makeId('received-record'),
    recorded_at: stamp(),
    state_class: 'received',
    braid_packet_id,
    what_arrived,
    what_changed,
    world_contribution,
    remained_silent,
    unresolved,
    asking_changed,
    what_returned,
    question_opens,
  });
}
