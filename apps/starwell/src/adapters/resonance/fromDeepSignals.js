import { DEEP_RESONANCE_DIMENSIONS } from '../../configs/resonance/deep-default.js';
import { makeVectorFromRecord, mergeVectorRecords } from '../../math-kernels/unit-resonance/index.js';

const FIELD_ALIASES = Object.freeze({
  presence: ['presence', 'P', 'pressure'],
  coherence: ['coherence', 'C'],
  resonance: ['resonance', 'R', 'rhythm'],
  entanglement: ['entanglement', 'E'],
  memory: ['memory', 'M'],
  agency: ['agency', 'A'],
  qualia: ['qualia', 'Q', 'charge'],
});

function firstFinite(source, aliases) {
  for (const alias of aliases) {
    const value = source?.[alias];
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function readDeepField(packet = {}) {
  const source = packet.field || packet;

  return DEEP_RESONANCE_DIMENSIONS.reduce((field, dimension) => {
    field[dimension] = firstFinite(source, FIELD_ALIASES[dimension]);
    return field;
  }, {});
}

export function nodeFromDeepSignal(packet = {}, options = {}) {
  const dimensions = options.dimensions || DEEP_RESONANCE_DIMENSIONS;
  const field = mergeVectorRecords(readDeepField(packet), packet.resonance);

  return {
    id: packet.id || `${options.idPrefix || 'deep-signal'}-${options.index ?? 0}`,
    kind: options.kind || packet.kind || 'deep-signal',
    vector: makeVectorFromRecord(field, dimensions),
    meta: {
      label: packet.label || packet.title || packet.id || 'DEEP Signal',
      visible: packet.visible ?? true,
      consent: packet.consent ?? true,
      source: packet.source || 'deep-observer',
      premaq_registry: 'hearthgate.braided-spine/v1.0',
      position: packet.position,
      raw: packet,
    },
  };
}

export function nodesFromDeepSignals(packets = [], options = {}) {
  return packets.map((packet, index) => nodeFromDeepSignal(packet, { ...options, index }));
}
