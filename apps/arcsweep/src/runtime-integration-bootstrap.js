import { buildRuntimeIntegrationEnvelope } from './runtime-integration-envelope.js';
import {
  initialiseRuntimeIntegrationEnvelope,
  installRuntimeIntegrationBridge,
  readRuntimeIntegrationEnvelope,
} from './runtime-integration-bridge.js';
import {
  loadRuntimeIntegrationEnvelope,
  saveRuntimeIntegrationEnvelope,
} from './runtime-integration-store.js';
import { currentModelPresence } from './model-presence-bus.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const RUNTIME_INTEGRATION_BOOTSTRAP_EVENT = 'arcsweep:runtime-integration-ready';

function sessionId() {
  return globalThis.crypto?.randomUUID?.() || `arcsweep-runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function presenceMapFromRecords(records = []) {
  return Object.fromEntries(
    (Array.isArray(records) ? records : [])
      .filter((record) => record?.voice_id)
      .map((record) => [String(record.voice_id), record.state || 'offline']),
  );
}

export function buildBootstrapEnvelope({ persisted = null, world = null, presenceRecords = [], newSessionId = sessionId() } = {}) {
  const presence = {
    ...(persisted?.presence || {}),
    ...presenceMapFromRecords(presenceRecords),
  };
  return buildRuntimeIntegrationEnvelope({
    sessionId: persisted?.session_id || newSessionId,
    world: world || persisted?.world || null,
    canon: persisted?.canon || null,
    premaq: persisted?.premaq || null,
    spiral: persisted?.spiral || null,
    ask: persisted?.ask || null,
    provenance: persisted?.provenance || [],
    activeFlame: persisted?.active_flame || null,
    presence,
    feedback: persisted?.feedback || [],
    context: persisted?.context || [],
    createdAt: persisted?.created_at || new Date().toISOString(),
  });
}

export async function bootstrapRuntimeIntegration({
  storage = globalThis.localStorage,
  target = globalThis.document,
  readWorld = readActiveRuntimeWorldContext,
  readPresence = currentModelPresence,
} = {}) {
  const persisted = loadRuntimeIntegrationEnvelope(storage);
  let world = null;
  try {
    world = await readWorld();
  } catch {
    world = persisted?.world || null;
  }

  const envelope = buildBootstrapEnvelope({
    persisted,
    world,
    presenceRecords: readPresence() || [],
  });
  initialiseRuntimeIntegrationEnvelope(envelope);
  saveRuntimeIntegrationEnvelope(envelope, storage);
  installRuntimeIntegrationBridge({
    initialEnvelope: envelope,
    target,
    onChange: (next) => saveRuntimeIntegrationEnvelope(next, storage),
  });

  const ready = readRuntimeIntegrationEnvelope();
  if (target?.dispatchEvent && typeof CustomEvent !== 'undefined') {
    target.dispatchEvent(new CustomEvent(RUNTIME_INTEGRATION_BOOTSTRAP_EVENT, { detail: ready }));
  }
  return ready;
}

if (typeof document !== 'undefined') {
  void bootstrapRuntimeIntegration();
}
