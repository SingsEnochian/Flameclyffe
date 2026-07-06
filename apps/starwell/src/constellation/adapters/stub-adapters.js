import { CONSTELLATION_TARGETS } from '../bridge.js';

function assertKnownTarget(target) {
  if (!CONSTELLATION_TARGETS[target]) throw new RangeError(`Unknown constellation target: ${target}`);
}

export function createStubAdapter(target, options = {}) {
  assertKnownTarget(target);
  const targetConfig = CONSTELLATION_TARGETS[target];

  return {
    id: target,
    engine: options.engine || targetConfig.default_engine,
    async send(request) {
      return {
        speaker: target,
        speaker_label: targetConfig.label,
        engine: options.engine || targetConfig.default_engine,
        room: request.room,
        message: options.message || `${targetConfig.label} adapter is registered but not connected yet.`,
        memory_used: options.memory_used || [],
        truth_label: options.truth_label || 'adapter_stub',
        metadata: {
          target_role: targetConfig.role,
          connected: false,
          ...(options.metadata || {}),
        },
      };
    },
  };
}

export function createVeeStubAdapter(options = {}) {
  return createStubAdapter('vee', options);
}

export function createFaerStubAdapter(options = {}) {
  return createStubAdapter('faer', options);
}

export function createDeepSeekStubAdapter(options = {}) {
  return createStubAdapter('deepseek', options);
}
