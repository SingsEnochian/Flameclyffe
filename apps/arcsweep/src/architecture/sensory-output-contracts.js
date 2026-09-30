export const SENSORY_ADAPTER_SCHEMA = 'arcsweep.sensory-adapter/v1';
export const OUTPUT_ADAPTER_SCHEMA = 'arcsweep.output-adapter/v1';
export const AUDITORY_RENDER_TARGET_SCHEMA = 'arcsweep.auditory-render-target/v1';

// Canonical input modalities a SensoryAdapter may declare
export const SENSORY_MODALITIES = Object.freeze([
  'text',
  'audio',
  'image',
  'video',
  'haptic',
  'spatial',
  'semantic-sound',
]);

// Canonical output channels an OutputAdapter may serve
export const OUTPUT_CHANNELS = Object.freeze([
  'text',
  'audio-air',
  'audio-bone',
  'haptic',
  'ar-overlay',
  'tts-stream',
  'subtitle',
  'braille',
  'assistive',
]);

// Canonical render modes for AuditoryRenderTarget
export const AUDITORY_RENDER_MODES = Object.freeze([
  'air-conduction',
  'bone-conduction',
  'spatial',
  'assistive',
  'subtitle-only',
]);

const MODALITY_SET = new Set(SENSORY_MODALITIES);
const CHANNEL_SET = new Set(OUTPUT_CHANNELS);
const RENDER_MODE_SET = new Set(AUDITORY_RENDER_MODES);

function text(value) {
  return String(value ?? '').trim();
}

function cleanList(value, validSet) {
  const list = Array.isArray(value) ? value : [];
  return Object.freeze(list.map((v) => text(v)).filter((v) => validSet.has(v)));
}

/**
 * A frozen descriptor for a SensoryAdapter — the input side of a surface.
 * Describes what input modalities the adapter can receive and normalise.
 * NOT a live adapter instance. Carries no credentials or authority.
 */
export function createSensoryAdapterDescriptor({
  id,
  modalities = [],
  displayName = null,
  surfaceHint = null,
} = {}) {
  const normId = text(id);
  if (!normId) throw new Error('sensory-adapter: id is required');
  return Object.freeze({
    schema: SENSORY_ADAPTER_SCHEMA,
    id: normId,
    display_name: text(displayName) || normId,
    surface_hint: text(surfaceHint) || null,
    modalities: cleanList(modalities, MODALITY_SET),
  });
}

/**
 * A frozen descriptor for an OutputAdapter — the output side of a surface.
 * Describes what output channels the adapter can render to.
 * NOT a live adapter instance. Carries no credentials or authority.
 */
export function createOutputAdapterDescriptor({
  id,
  channels = [],
  displayName = null,
  surfaceHint = null,
} = {}) {
  const normId = text(id);
  if (!normId) throw new Error('output-adapter: id is required');
  return Object.freeze({
    schema: OUTPUT_ADAPTER_SCHEMA,
    id: normId,
    display_name: text(displayName) || normId,
    surface_hint: text(surfaceHint) || null,
    channels: cleanList(channels, CHANNEL_SET),
  });
}

/**
 * A frozen descriptor for an AuditoryRenderTarget — specialised output contract
 * for bone-conduction, spatial, and assistive audio surfaces.
 * Separates hearing path from text path without collapsing into a generic output channel.
 */
export function createAuditoryRenderTargetDescriptor({
  id,
  renderModes = [],
  displayName = null,
  maxLatencyMs = null,
  assistive = false,
} = {}) {
  const normId = text(id);
  if (!normId) throw new Error('auditory-render-target: id is required');
  const resolvedLatency = Number.isFinite(Number(maxLatencyMs)) ? Number(maxLatencyMs) : null;
  return Object.freeze({
    schema: AUDITORY_RENDER_TARGET_SCHEMA,
    id: normId,
    display_name: text(displayName) || normId,
    render_modes: cleanList(renderModes, RENDER_MODE_SET),
    max_latency_ms: resolvedLatency,
    assistive: Boolean(assistive),
  });
}

/**
 * Asserts that `adapter` satisfies the minimal SensoryAdapter runtime contract:
 *   { id: string, modalities: string[], receive: function }
 */
export function assertSensoryAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('sensory-adapter: expected an object');
  }
  if (!text(adapter.id)) throw new Error('sensory-adapter: id must be a non-empty string');
  if (!Array.isArray(adapter.modalities)) throw new Error('sensory-adapter: modalities must be an array');
  if (typeof adapter.receive !== 'function') throw new Error('sensory-adapter: receive must be a function');
  return adapter;
}

/**
 * Asserts that `adapter` satisfies the minimal OutputAdapter runtime contract:
 *   { id: string, channels: string[], render: function }
 */
export function assertOutputAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('output-adapter: expected an object');
  }
  if (!text(adapter.id)) throw new Error('output-adapter: id must be a non-empty string');
  if (!Array.isArray(adapter.channels)) throw new Error('output-adapter: channels must be an array');
  if (typeof adapter.render !== 'function') throw new Error('output-adapter: render must be a function');
  return adapter;
}

/**
 * Asserts that `target` satisfies the minimal AuditoryRenderTarget runtime contract:
 *   { id: string, renderModes: string[], renderAudio: function }
 */
export function assertAuditoryRenderTarget(target) {
  if (!target || typeof target !== 'object') {
    throw new Error('auditory-render-target: expected an object');
  }
  if (!text(target.id)) throw new Error('auditory-render-target: id must be a non-empty string');
  if (!Array.isArray(target.renderModes)) throw new Error('auditory-render-target: renderModes must be an array');
  if (typeof target.renderAudio !== 'function') throw new Error('auditory-render-target: renderAudio must be a function');
  return target;
}
