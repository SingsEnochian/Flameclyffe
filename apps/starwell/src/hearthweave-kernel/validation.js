import {
  DualAspectError,
  validateDualAspectPacket as validatePacketStructure,
} from './dual-aspect.js';

const REQUIRED_BINDINGS = Object.freeze([
  'observable',
  'experiential',
  'glyph',
  'tone',
  'visual',
  'haptic',
  'narrative',
]);

const EXPRESSION_BINDINGS = Object.freeze([
  'glyph',
  'tone',
  'visual',
  'haptic',
  'narrative',
]);

export function validateDualAspectPacket(packetInput, options = {}) {
  const packet = validatePacketStructure(packetInput, options);
  const shared = packet.correspondence.shared_state_fingerprint;
  const bindings = packet.correspondence.bindings;

  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
    throw new DualAspectError(
      'Dual-aspect correspondence bindings are required',
      'missing-correspondence-bindings',
    );
  }

  for (const binding of REQUIRED_BINDINGS) {
    if (typeof bindings[binding] !== 'string' || bindings[binding].trim() === '') {
      throw new DualAspectError(
        `Missing correspondence binding: ${binding}`,
        'missing-correspondence-binding',
      );
    }
    if (bindings[binding] !== shared) {
      throw new DualAspectError(
        `${binding} is bound to a divergent state`,
        'hidden-state-divergence',
      );
    }
  }

  for (const expression of EXPRESSION_BINDINGS) {
    const derived = packet.experiential?.[expression];
    if (!derived || typeof derived !== 'object' || Array.isArray(derived)) {
      throw new DualAspectError(
        `Missing experiential expression: ${expression}`,
        'missing-experiential-expression',
      );
    }
    if (derived.shared_state_fingerprint !== shared) {
      throw new DualAspectError(
        `${expression} expression carries a divergent state`,
        'hidden-state-divergence',
      );
    }
    if (derived.premaq_id !== packet.observable.premaq.id) {
      throw new DualAspectError(
        `${expression} expression carries a divergent PREMAQ reference`,
        'hidden-premaq-divergence',
      );
    }
    if (derived.deep_snapshot_id !== packet.observable.deep_snapshot.snapshot_id) {
      throw new DualAspectError(
        `${expression} expression carries a divergent DEEP reference`,
        'hidden-deep-divergence',
      );
    }
  }

  return packet;
}

export { REQUIRED_BINDINGS as DUAL_ASPECT_REQUIRED_BINDINGS };
