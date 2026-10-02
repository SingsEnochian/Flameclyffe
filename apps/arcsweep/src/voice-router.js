export const VOICE_RENDER_RECEIPT_SCHEMA = 'arcsweep.voice-render-receipt/v0.1';

function assertAdapter(adapter, engineId) {
  if (!adapter || typeof adapter.render !== 'function') {
    throw new Error(`Voice adapter ${engineId} must expose render(intent, context).`);
  }
}

export function createVoiceRouter({ adapters = {}, defaultEngine } = {}) {
  const registry = new Map(Object.entries(adapters));
  if (!defaultEngine || !registry.has(defaultEngine)) {
    throw new Error('Voice router requires a registered defaultEngine.');
  }
  for (const [engineId, adapter] of registry.entries()) assertAdapter(adapter, engineId);

  return Object.freeze({
    engines: Object.freeze([...registry.keys()]),
    async render(intent, { engine = defaultEngine, context = {} } = {}) {
      const adapter = registry.get(engine);
      if (!adapter) throw new Error(`Unregistered voice engine: ${engine}`);
      const startedAt = new Date().toISOString();
      const rendered = await adapter.render(intent, context);

      if (!rendered || !rendered.audioRef) {
        throw new Error(`Voice engine ${engine} returned no audioRef.`);
      }

      return Object.freeze({
        schema: VOICE_RENDER_RECEIPT_SCHEMA,
        engine,
        voiceId: intent.voiceId,
        identityId: intent.identityId,
        mode: intent.mode,
        startedAt,
        completedAt: new Date().toISOString(),
        audioRef: rendered.audioRef,
        durationMs: rendered.durationMs ?? null,
        sampleRate: rendered.sampleRate ?? null,
        engineReceipt: rendered.receipt ?? null,
        sourceTextPreserved: rendered.sourceTextPreserved !== false,
      });
    },
  });
}
