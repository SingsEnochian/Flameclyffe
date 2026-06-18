import { DEEP_RESONANCE_DIMENSIONS } from '../../configs/resonance/deep-default.js';
import { makeVectorFromRecord, mergeVectorRecords } from '../../math-kernels/unit-resonance/index.js';

const FIELD_ALIASES = Object.freeze({
  pressure: 'P',
  coherence: 'C',
  rhythm: 'R',
  entropy: 'E',
  memory: 'M',
  attention: 'A',
});

function readDeepField(packet = {}) {
  const source = packet.field || packet;

  return DEEP_RESONANCE_DIMENSIONS.reduce((field, dimension) => {
    const alias = FIELD_ALIASES[dimension];
    field[dimension] = source[dimension] ?? source[alias] ?? 0;
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
      position: packet.position,
      raw: packet,
    },
  };
}

export function nodesFromDeepSignals(packets = [], options = {}) {
  return packets.map((packet, index) => nodeFromDeepSignal(packet, { ...options, index }));
}
