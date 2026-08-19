import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const ASK_PACKET_SCHEMA = 'bifrost.ask-packet/v1';
export const ASK_RESPONSE_SCHEMA = 'bifrost.ask-response/v1';
export const DIMENSIONAL_ADDRESS_SCHEMA = 'bifrost.dimensional-address/v1';
export const LATTICE_COORDINATE_SCHEMA = 'bifrost.e8x32-coordinate/v1';

export const RESPONSE_CODES = Object.freeze([
  'ACK',
  'ACCEPT',
  'REFUSE',
  'DEFER',
  'COUNTER',
  'PARTIAL',
  'UNKNOWN',
  'EXPIRED',
]);

export const EVIDENCE_CLASSES = Object.freeze([
  'observed',
  'derived',
  'simulated',
  'symbolic',
  'model-generated',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`BIFROST_PROTOCOL: ${message}`);
}

function text(value, field) {
  const normalised = String(value ?? '').trim();
  invariant(normalised, `${field} is required`);
  return normalised;
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function normaliseEvidence(evidence = []) {
  invariant(Array.isArray(evidence), 'evidence must be an array');
  return Object.freeze(evidence.map((item, index) => {
    const evidenceClass = text(item?.class, `evidence[${index}].class`);
    invariant(EVIDENCE_CLASSES.includes(evidenceClass), `evidence[${index}].class is not recognised`);
    return Object.freeze({
      class: evidenceClass,
      source: text(item?.source, `evidence[${index}].source`),
      value: item?.value ?? null,
      receipt_id: item?.receipt_id ? String(item.receipt_id) : null,
      confidence: item?.confidence == null ? null : finite(item.confidence, `evidence[${index}].confidence`),
    });
  }));
}

function normaliseConsent(consent = {}) {
  const required = consent?.required !== false;
  const granted = consent?.granted === true;
  const revocable = consent?.revocable !== false;
  const scope = String(consent?.scope ?? '').trim();
  if (required) invariant(scope, 'consent.scope is required when consent is required');
  return Object.freeze({ required, granted, revocable, scope: scope || null });
}

function normaliseConstraints(constraints = {}) {
  const preserve = Array.isArray(constraints?.preserve)
    ? [...new Set(constraints.preserve.map(String).map((value) => value.trim()).filter(Boolean))]
    : [];
  const forbid = Array.isArray(constraints?.forbid)
    ? [...new Set(constraints.forbid.map(String).map((value) => value.trim()).filter(Boolean))]
    : [];
  return Object.freeze({
    preserve: Object.freeze(preserve),
    forbid: Object.freeze(forbid),
    allow_counterproposal: constraints?.allow_counterproposal !== false,
    allow_partial: constraints?.allow_partial !== false,
  });
}

export function parseDimensionalAddress(value) {
  const raw = text(value, 'dimensional address');
  const match = raw.match(/^([0-9]{1,4})\.([0-9]{1,4})\.([0-9]{1,4})\.([0-9]{1,4})(?:@([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?(?::(?:phi=|φ=)?([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?$/iu);
  invariant(match, 'address must match X.Y.Z.T[@frequency][:phase]');

  const fields = match.slice(1, 5).map((part, index) => {
    const number = Number(part);
    invariant(Number.isInteger(number) && number >= 0 && number <= 255, `address field ${index + 1} must lie within 0..255`);
    return number;
  });

  const frequency = match[5] == null ? null : finite(match[5], 'frequency');
  invariant(frequency == null || frequency > 0, 'frequency must be greater than zero');
  const phase = match[6] == null ? null : finite(match[6], 'phase');

  return Object.freeze({
    schema: DIMENSIONAL_ADDRESS_SCHEMA,
    x: fields[0],
    y: fields[1],
    z: fields[2],
    t: fields[3],
    frequency,
    phase,
  });
}

export function formatDimensionalAddress(address, { padded = true } = {}) {
  invariant(address?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'a parsed dimensional address is required');
  const field = (number) => padded ? String(number).padStart(4, '0') : String(number);
  const base = `${field(address.x)}.${field(address.y)}.${field(address.z)}.${field(address.t)}`;
  const frequency = address.frequency == null ? '' : `@${address.frequency}`;
  const phase = address.phase == null ? '' : `:φ=${address.phase}`;
  return `${base}${frequency}${phase}`;
}

export function createDimensionalNameRegistry(entries = []) {
  invariant(Array.isArray(entries), 'registry entries must be an array');
  const byName = new Map();
  for (const entry of entries) {
    const name = text(entry?.name, 'registry name').toLowerCase();
    invariant(!byName.has(name), `duplicate dimensional name: ${name}`);
    const address = typeof entry.address === 'string' ? parseDimensionalAddress(entry.address) : entry.address;
    invariant(address?.schema === DIMENSIONAL_ADDRESS_SCHEMA, `registry entry ${name} requires a dimensional address`);
    byName.set(name, Object.freeze({ name, address, metadata: Object.freeze({ ...(entry.metadata || {}) }) }));
  }
  return Object.freeze({
    size: byName.size,
    resolve(name) {
      const key = String(name ?? '').trim().toLowerCase();
      return byName.get(key) ?? null;
    },
    names() {
      return Object.freeze([...byName.keys()].sort());
    },
  });
}

export async function resolveE8x32Coordinate(address) {
  const parsed = typeof address === 'string' ? parseDimensionalAddress(address) : address;
  invariant(parsed?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'a dimensional address is required');
  const canonical = formatDimensionalAddress(parsed);
  const blocks = [];

  for (let blockIndex = 0; blockIndex < 32; blockIndex += 1) {
    const digest = await sha256Hex({ canonical, block_index: blockIndex });
    const components = [];
    for (let componentIndex = 0; componentIndex < 8; componentIndex += 1) {
      const byte = Number.parseInt(digest.slice(componentIndex * 2, componentIndex * 2 + 2), 16);
      components.push((byte % 17) - 8);
    }
    const parity = components.reduce((sum, value) => sum + value, 0) % 2;
    if (parity !== 0) components[7] += components[7] === 8 ? -1 : 1;
    blocks.push(Object.freeze(components));
  }

  return Object.freeze({
    schema: LATTICE_COORDINATE_SCHEMA,
    address: canonical,
    dimensions: 256,
    construction: 'E8^32 via D8 integer-sublattice representatives',
    blocks: Object.freeze(blocks),
  });
}

export async function createAskPacket({
  sender,
  target,
  world,
  intention,
  transformation,
  constraints = {},
  consent = {},
  premaqc = null,
  evidence = [],
  ttl = 8,
  nonce = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const ttlValue = Number(ttl);
  invariant(Number.isInteger(ttlValue) && ttlValue >= 1 && ttlValue <= 64, 'ttl must be an integer from 1..64');
  invariant(!Number.isNaN(Date.parse(createdAt)), 'createdAt must be an ISO-compatible timestamp');

  const consentRecord = normaliseConsent(consent);
  const core = {
    schema: ASK_PACKET_SCHEMA,
    schema_version: 1,
    sender: text(sender, 'sender'),
    target: text(target, 'target'),
    world: text(world, 'world'),
    created_at: new Date(createdAt).toISOString(),
    intention: text(intention, 'intention'),
    transformation: text(transformation, 'transformation'),
    constraints: normaliseConstraints(constraints),
    consent: consentRecord,
    premaqc: premaqc ?? null,
    evidence: normaliseEvidence(evidence),
    transport: {
      ttl: ttlValue,
      hop_count: 0,
      nonce: nonce ? String(nonce) : null,
      loopback: false,
    },
    authority: {
      ask_is_observation: false,
      ask_is_success: false,
      receipt_required: true,
      consent_required: consentRecord.required,
      consent_granted_at_send: consentRecord.granted,
    },
  };

  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    packet_id: `bifrost-ask-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export function routeAskPacket(packet, hop) {
  invariant(packet?.schema === ASK_PACKET_SCHEMA, 'an Ask packet is required');
  invariant(packet.transport.ttl > 0, 'packet has expired');
  const hopName = text(hop, 'hop');
  const path = Array.isArray(packet.transport.path) ? [...packet.transport.path] : [];
  const loopback = path.includes(hopName);
  path.push(hopName);
  return Object.freeze({
    ...packet,
    transport: Object.freeze({
      ...packet.transport,
      ttl: packet.transport.ttl - 1,
      hop_count: packet.transport.hop_count + 1,
      loopback,
      path: Object.freeze(path),
    }),
  });
}

export async function createAskResponse({
  packet,
  code = 'ACK',
  responder,
  message = '',
  counterproposal = null,
  evidence = [],
  respondedAt = new Date().toISOString(),
} = {}) {
  invariant(packet?.schema === ASK_PACKET_SCHEMA, 'an Ask packet is required');
  invariant(RESPONSE_CODES.includes(code), `response code must be one of ${RESPONSE_CODES.join(', ')}`);
  invariant(!Number.isNaN(Date.parse(respondedAt)), 'respondedAt must be an ISO-compatible timestamp');
  if (code === 'COUNTER') invariant(String(counterproposal ?? '').trim(), 'COUNTER requires a counterproposal');
  if (code === 'ACCEPT') invariant(!packet.consent.required || packet.consent.granted, 'ACCEPT cannot override required consent');

  const core = {
    schema: ASK_RESPONSE_SCHEMA,
    schema_version: 1,
    packet_id: packet.packet_id,
    packet_fingerprint: packet.fingerprint,
    responded_at: new Date(respondedAt).toISOString(),
    responder: text(responder, 'responder'),
    code,
    message: String(message ?? '').trim() || null,
    counterproposal: String(counterproposal ?? '').trim() || null,
    evidence: normaliseEvidence(evidence),
    authority: {
      receipt_of_ask: ['ACK', 'ACCEPT', 'REFUSE', 'DEFER', 'COUNTER', 'PARTIAL'].includes(code),
      success_declared: code === 'ACCEPT' ? 'accepted-not-yet-observed' : false,
      silence_is_agreement: false,
      response_rewrites_observation: false,
    },
  };

  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    response_id: `bifrost-response-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export function diagnosticAcknowledgement({
  reason,
  recoverable = false,
  loopback = false,
  checksumMismatch = false,
} = {}) {
  const billTheCat = Boolean(recoverable && (loopback || checksumMismatch));
  return Object.freeze({
    code: billTheCat ? 'ACK-THPPPT' : 'ACK',
    reason: String(reason ?? '').trim() || null,
    recoverable: Boolean(recoverable),
    easter_egg: billTheCat ? Object.freeze({
      protocol: 'BCEP/1',
      label: 'Bill the Cat Easter Egg Protocol',
      presentation: 'scraggly-orange-cat-one-eye-tongue-out',
      documentation: 'ancient protocol. do not remove.',
    }) : null,
  });
}
