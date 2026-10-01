import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SENSORY_ADAPTER_SCHEMA,
  OUTPUT_ADAPTER_SCHEMA,
  AUDITORY_RENDER_TARGET_SCHEMA,
  SENSORY_MODALITIES,
  OUTPUT_CHANNELS,
  AUDITORY_RENDER_MODES,
  createSensoryAdapterDescriptor,
  createOutputAdapterDescriptor,
  createAuditoryRenderTargetDescriptor,
  assertSensoryAdapter,
  assertOutputAdapter,
  assertAuditoryRenderTarget,
} from '../src/architecture/sensory-output-contracts.js';

// --- SensoryAdapter ---

test('SensoryAdapter descriptor is frozen and schema-tagged', () => {
  const d = createSensoryAdapterDescriptor({
    id: 'web-mic',
    modalities: ['audio', 'text'],
    displayName: 'Web Microphone',
    surfaceHint: 'web',
  });
  assert.equal(d.schema, SENSORY_ADAPTER_SCHEMA);
  assert.equal(d.id, 'web-mic');
  assert.equal(d.display_name, 'Web Microphone');
  assert.equal(d.surface_hint, 'web');
  assert.deepEqual([...d.modalities], ['audio', 'text']);
  assert.equal(Object.isFrozen(d), true);
  assert.equal(Object.isFrozen(d.modalities), true);
});

test('SensoryAdapter strips unknown modalities', () => {
  const d = createSensoryAdapterDescriptor({ id: 'x', modalities: ['text', 'telepathy', 'esper'] });
  assert.deepEqual([...d.modalities], ['text']);
});

test('SensoryAdapter requires id', () => {
  assert.throws(() => createSensoryAdapterDescriptor({}), /id is required/);
});

test('SensoryAdapter descriptor carries no authority fields', () => {
  const d = createSensoryAdapterDescriptor({ id: 'sensor', modalities: ['audio'] });
  for (const forbidden of ['authority', 'credentials', 'api_key', 'elevated']) {
    assert.equal(Object.hasOwn(d, forbidden), false, `unexpected field: ${forbidden}`);
  }
});

test('SENSORY_MODALITIES is frozen and non-empty', () => {
  assert.equal(Object.isFrozen(SENSORY_MODALITIES), true);
  assert.ok(SENSORY_MODALITIES.length > 0);
  assert.ok(SENSORY_MODALITIES.includes('text'));
  assert.ok(SENSORY_MODALITIES.includes('audio'));
});

test('assertSensoryAdapter accepts valid runtime shape', () => {
  const adapter = { id: 'mic', modalities: ['audio'], receive: async () => {} };
  assert.equal(assertSensoryAdapter(adapter), adapter);
});

test('assertSensoryAdapter rejects missing id', () => {
  assert.throws(() => assertSensoryAdapter({ id: '', modalities: [], receive: () => {} }), /id must/);
});

test('assertSensoryAdapter rejects missing receive', () => {
  assert.throws(() => assertSensoryAdapter({ id: 'x', modalities: [] }), /receive must/);
});

// --- OutputAdapter ---

test('OutputAdapter descriptor is frozen and schema-tagged', () => {
  const d = createOutputAdapterDescriptor({
    id: 'discord-chat',
    channels: ['text', 'tts-stream'],
    displayName: 'Discord Chat Output',
    surfaceHint: 'discord',
  });
  assert.equal(d.schema, OUTPUT_ADAPTER_SCHEMA);
  assert.equal(d.id, 'discord-chat');
  assert.deepEqual([...d.channels], ['text', 'tts-stream']);
  assert.equal(Object.isFrozen(d), true);
});

test('OutputAdapter strips unknown channels', () => {
  const d = createOutputAdapterDescriptor({ id: 'x', channels: ['text', 'mind-link', 'braille'] });
  assert.deepEqual([...d.channels], ['text', 'braille']);
});

test('OutputAdapter requires id', () => {
  assert.throws(() => createOutputAdapterDescriptor({}), /id is required/);
});

test('OutputAdapter descriptor carries no authority fields', () => {
  const d = createOutputAdapterDescriptor({ id: 'out', channels: ['text'] });
  for (const forbidden of ['authority', 'credentials', 'api_key', 'elevated']) {
    assert.equal(Object.hasOwn(d, forbidden), false, `unexpected field: ${forbidden}`);
  }
});

test('OUTPUT_CHANNELS is frozen and contains air-conduction and bone-conduction paths', () => {
  assert.equal(Object.isFrozen(OUTPUT_CHANNELS), true);
  assert.ok(OUTPUT_CHANNELS.includes('audio-air'));
  assert.ok(OUTPUT_CHANNELS.includes('audio-bone'));
  assert.ok(OUTPUT_CHANNELS.includes('assistive'));
});

test('assertOutputAdapter accepts valid runtime shape', () => {
  const adapter = { id: 'speaker', channels: ['audio-air'], render: async () => {} };
  assert.equal(assertOutputAdapter(adapter), adapter);
});

test('assertOutputAdapter rejects missing channels array', () => {
  assert.throws(() => assertOutputAdapter({ id: 'x', channels: 'text', render: () => {} }), /channels must/);
});

test('assertOutputAdapter rejects missing render', () => {
  assert.throws(() => assertOutputAdapter({ id: 'x', channels: [] }), /render must/);
});

// --- AuditoryRenderTarget ---

test('AuditoryRenderTarget descriptor is frozen and schema-tagged', () => {
  const d = createAuditoryRenderTargetDescriptor({
    id: 'bone-left',
    renderModes: ['bone-conduction', 'assistive'],
    displayName: 'Bone Conduction Left',
    maxLatencyMs: 40,
    assistive: true,
  });
  assert.equal(d.schema, AUDITORY_RENDER_TARGET_SCHEMA);
  assert.equal(d.id, 'bone-left');
  assert.deepEqual([...d.render_modes], ['bone-conduction', 'assistive']);
  assert.equal(d.max_latency_ms, 40);
  assert.equal(d.assistive, true);
  assert.equal(Object.isFrozen(d), true);
});

test('AuditoryRenderTarget strips unknown render modes', () => {
  const d = createAuditoryRenderTargetDescriptor({ id: 'ar', renderModes: ['spatial', 'dream-sound', 'air-conduction'] });
  assert.deepEqual([...d.render_modes], ['spatial', 'air-conduction']);
});

test('AuditoryRenderTarget requires id', () => {
  assert.throws(() => createAuditoryRenderTargetDescriptor({}), /id is required/);
});

test('AuditoryRenderTarget descriptor carries no authority fields', () => {
  const d = createAuditoryRenderTargetDescriptor({ id: 'bone', renderModes: ['bone-conduction'] });
  for (const forbidden of ['authority', 'credentials', 'api_key', 'elevated']) {
    assert.equal(Object.hasOwn(d, forbidden), false, `unexpected field: ${forbidden}`);
  }
});

test('AuditoryRenderTarget maxLatencyMs defaults to null for non-finite input', () => {
  const d = createAuditoryRenderTargetDescriptor({ id: 'x', renderModes: ['air-conduction'], maxLatencyMs: 'fast' });
  assert.equal(d.max_latency_ms, null);
});

test('AUDITORY_RENDER_MODES is frozen and covers bone-conduction and assistive', () => {
  assert.equal(Object.isFrozen(AUDITORY_RENDER_MODES), true);
  assert.ok(AUDITORY_RENDER_MODES.includes('bone-conduction'));
  assert.ok(AUDITORY_RENDER_MODES.includes('assistive'));
  assert.ok(AUDITORY_RENDER_MODES.includes('air-conduction'));
});

test('assertAuditoryRenderTarget accepts valid runtime shape', () => {
  const target = { id: 'bt-bone', renderModes: ['bone-conduction'], renderAudio: async () => {} };
  assert.equal(assertAuditoryRenderTarget(target), target);
});

test('assertAuditoryRenderTarget rejects missing renderAudio', () => {
  assert.throws(() => assertAuditoryRenderTarget({ id: 'x', renderModes: [] }), /renderAudio must/);
});

// --- Cross-contract: surface != identity ---

test('surface-hint on sensory/output descriptors does not become identity', () => {
  const sensory = createSensoryAdapterDescriptor({ id: 'discord-input', modalities: ['text'], surfaceHint: 'discord' });
  const output = createOutputAdapterDescriptor({ id: 'discord-output', channels: ['text'], surfaceHint: 'discord' });
  // surface_hint is a hint, not an id — descriptors have their own id
  assert.notEqual(sensory.surface_hint, sensory.id);
  assert.equal(sensory.surface_hint, 'discord');
  assert.equal(output.surface_hint, 'discord');
  assert.equal(Object.hasOwn(sensory, 'identity_id'), false);
  assert.equal(Object.hasOwn(output, 'identity_id'), false);
});


test('AuditoryRenderTarget preserves omitted, null, and blank latency as unknown', () => {
  for (const maxLatencyMs of [undefined, null, '', '   ']) {
    const d = createAuditoryRenderTargetDescriptor({
      id: 'unknown-latency',
      renderModes: ['air-conduction'],
      maxLatencyMs,
    });
    assert.equal(d.max_latency_ms, null);
  }
});
