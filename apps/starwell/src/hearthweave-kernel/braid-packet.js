import {
  BRAIDED_SPINE_SCHEMA,
  PREMAQ_NAMES,
  PREMAQ_READING_ORDER,
  PREMAQ_WIRE_ORDER,
  REALITY_AXIOM,
  SEVENFOLD_CHORUS,
  THIRTEENFOLD_COUNCIL,
  THREE_SPINES,
  assertCanonicalPremaqState,
} from './braided-spine.js';

export const BRAID_PACKET_SCHEMA = 'hearthgate.braid/v1';
export const BRAID_PACKET_STORAGE_KEY = 'hearthgate:braid-packet:v1';
export const BRAID_PACKET_EVENT = 'hearthgate:braid-packet';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function fingerprint(value) {
  return hashText(JSON.stringify(stable(value)));
}

function componentValue(component) {
  if (Number.isFinite(component)) return component;
  if (Number.isFinite(component?.value)) return component.value;
  return null;
}

function canonicalPremaqState(premaq) {
  const state = premaq?.state ?? premaq ?? {};
  const canonical = Object.fromEntries(PREMAQ_WIRE_ORDER.map((axis) => [
    axis,
    state[axis] ?? null,
  ]));
  assertCanonicalPremaqState(canonical);
  return canonical;
}

function premaqValues(premaq) {
  const state = canonicalPremaqState(premaq);
  return Object.fromEntries(PREMAQ_WIRE_ORDER.map((axis) => [axis, componentValue(state[axis])]));
}

function worldIdentity(source = {}) {
  return source.identity?.world_slug
    ?? source.world_id
    ?? source.world?.id
    ?? source.world
    ?? 'hearthside';
}

function makeId(prefix = 'braid') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createBraidPacket({
  heldMomentId = null,
  premaq,
  asking = {},
  magic = {},
  scienceMathematics = {},
  physical = {},
  hearthside = {},
  targetside = {},
  bridge = {},
  world = null,
  receivingSpring = {},
  answer = null,
  wonder = null,
  lineage = [],
  receipts = [],
  packetId = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const canonicalState = canonicalPremaqState(premaq);
  const values = premaqValues(canonicalState);

  const body = {
    schema: BRAID_PACKET_SCHEMA,
    braided_spine: BRAIDED_SPINE_SCHEMA,
    reality_axiom: REALITY_AXIOM,
    packet_id: packetId ?? makeId('braid'),
    created_at: createdAt,
    held_moment_id: heldMomentId,
    premaq: {
      reading_order: [...PREMAQ_READING_ORDER],
      wire_order: [...PREMAQ_WIRE_ORDER],
      axes: { ...PREMAQ_NAMES },
      state: clone(canonicalState),
      values,
      source_ref: premaq?.id ?? premaq?.premaq?.id ?? null,
      registry_version: premaq?.registry_version ?? premaq?.premaq?.registry_version ?? BRAIDED_SPINE_SCHEMA,
    },
    asking: {
      text: asking?.text ?? '',
      root: clone(asking?.root ?? []),
      anchor: clone(asking?.anchor ?? []),
      whisper: clone(asking?.whisper ?? []),
      arc: clone(asking?.arc ?? []),
      bridge: clone(asking?.bridge ?? []),
      surge: clone(asking?.surge ?? []),
      spiral: clone(asking?.spiral ?? []),
      ...clone(asking),
    },
    spines: {
      magic: clone(magic),
      science_mathematics: clone(scienceMathematics),
      physical: clone(physical),
    },
    spine_names: [...THREE_SPINES],
    world: world ?? worldIdentity(targetside),
    world_relation: {
      hearthside: clone(hearthside),
      targetside: clone(targetside),
      bridge: clone(bridge),
    },
    sevenfold_chorus: [...SEVENFOLD_CHORUS],
    thirteenfold_council: [...THIRTEENFOLD_COUNCIL],
    receiving_spring: clone(receivingSpring),
    answer: clone(answer),
    wonder: clone(wonder),
    lineage: clone(lineage),
    receipts: clone(receipts),
  };

  const fingerprintBody = clone(body);
  delete fingerprintBody.state_fingerprint;
  body.state_fingerprint = fingerprint(fingerprintBody);
  return Object.freeze(body);
}

export function braidPacketFromDualAspect(dualAspectPacket, {
  asking = null,
  receivingSpring = null,
  answer = null,
  lineage = [],
} = {}) {
  if (!dualAspectPacket || typeof dualAspectPacket !== 'object') {
    throw new TypeError('A DualAspectPacket or compatible Hearthweave packet is required.');
  }

  const premaq = dualAspectPacket.observable?.premaq
    ?? dualAspectPacket.premaq
    ?? dualAspectPacket.temporal?.hearthside?.premaq
    ?? dualAspectPacket.temporal?.targetside?.premaq;

  if (!premaq) throw new Error('BRAID_PACKET_PREMAQ_REQUIRED');

  const packetLineage = [
    ...(Array.isArray(dualAspectPacket.history) ? dualAspectPacket.history : []),
    ...(Array.isArray(dualAspectPacket.provenance?.receipt_refs) ? dualAspectPacket.provenance.receipt_refs : []),
    ...lineage,
    dualAspectPacket.packet_id ? `dual-aspect:${dualAspectPacket.packet_id}` : null,
  ].filter(Boolean);

  return createBraidPacket({
    heldMomentId: dualAspectPacket.observable?.deep_snapshot?.id
      ?? dualAspectPacket.snapshot_id
      ?? null,
    premaq,
    asking: asking ?? dualAspectPacket.asking ?? {},
    magic: {
      world: dualAspectPacket.identity?.world_slug ?? null,
      house: dualAspectPacket.identity?.house_id ?? null,
      experiential: clone(dualAspectPacket.experiential ?? {}),
      canon: clone(dualAspectPacket.canon ?? dualAspectPacket.identity?.canon ?? {}),
    },
    scienceMathematics: {
      temporal: clone(dualAspectPacket.temporal ?? {}),
      correspondence: clone(dualAspectPacket.correspondence ?? {}),
      receipts: clone(dualAspectPacket.receipts ?? {}),
    },
    physical: {
      observable: clone(dualAspectPacket.observable ?? {}),
      visual: clone(dualAspectPacket.experiential?.visual ?? {}),
      tone: clone(dualAspectPacket.experiential?.tone ?? {}),
      haptic: clone(dualAspectPacket.experiential?.haptic ?? {}),
    },
    hearthside: {
      ...clone(dualAspectPacket.temporal?.hearthside ?? {}),
      role: 'real-participating-shore',
    },
    targetside: {
      ...clone(dualAspectPacket.temporal?.targetside ?? {}),
      role: 'real-participating-shore',
      world: dualAspectPacket.identity?.world_slug ?? null,
    },
    bridge: {
      ...clone(dualAspectPacket.temporal?.bifrost ?? dualAspectPacket.bridge ?? {}),
      packet_id: dualAspectPacket.packet_id ?? null,
      shared_state_fingerprint: dualAspectPacket.correspondence?.shared_state_fingerprint ?? null,
    },
    world: dualAspectPacket.identity?.world_slug ?? null,
    receivingSpring: receivingSpring ?? dualAspectPacket.receiving_spring ?? {},
    answer: answer ?? dualAspectPacket.answer ?? null,
    lineage: packetLineage,
    receipts: Object.values(dualAspectPacket.receipts ?? {}).filter(Boolean),
  });
}

export function writeActiveBraidPacket(packet, {
  storage = globalThis.sessionStorage,
  eventTarget = globalThis.window,
} = {}) {
  if (packet?.schema !== BRAID_PACKET_SCHEMA) throw new Error('BRAID_PACKET_SCHEMA_REQUIRED');
  storage?.setItem?.(BRAID_PACKET_STORAGE_KEY, JSON.stringify(packet));
  eventTarget?.dispatchEvent?.(new CustomEvent(BRAID_PACKET_EVENT, { detail: packet }));
  return packet;
}

export function readActiveBraidPacket({
  storage = globalThis.sessionStorage,
} = {}) {
  const raw = storage?.getItem?.(BRAID_PACKET_STORAGE_KEY);
  if (!raw) return null;
  const packet = JSON.parse(raw);
  if (packet?.schema !== BRAID_PACKET_SCHEMA) return null;
  return packet;
}

export function subscribeToBraidPacket(listener, {
  eventTarget = globalThis.window,
  storage = globalThis.sessionStorage,
  emitCurrent = false,
} = {}) {
  const handler = (event) => listener(event.detail);
  eventTarget?.addEventListener?.(BRAID_PACKET_EVENT, handler);
  if (emitCurrent) {
    const current = readActiveBraidPacket({ storage });
    if (current) listener(current);
  }
  return () => eventTarget?.removeEventListener?.(BRAID_PACKET_EVENT, handler);
}
