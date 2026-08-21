import { bootstrapRuntimeIntegration } from '../apps/arcsweep/src/runtime-integration-bootstrap.js';
import { loadRuntimeIntegrationEnvelope } from '../apps/arcsweep/src/runtime-integration-store.js';
import { publishModelPresence } from '../apps/arcsweep/src/model-presence-bus.js';
import { CONSTELLATION_LENS_EVENTS } from '../apps/arcsweep/src/constellation-lens.js';
import {
  buildRuntimeReplayReceipt,
  restoreEnvelopeFromReplay,
  runtimeReplayEquivalent,
} from '../apps/arcsweep/src/runtime-integration-replay.js';
import { createHouseCommonsHandler } from '../netlify/functions/_shared/house-commons-runtime.mjs';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNTIME_SMOKE: ${message}`);
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function commonsStore() {
  const rows = new Map();
  return {
    async list() { return { blobs: [...rows.keys()].map((key) => ({ key })) }; },
    async get(key) { return rows.get(key) || null; },
    async setJSON(key, value) { rows.set(key, structuredClone(value)); },
  };
}

function detailEvent(type, detail) {
  if (typeof CustomEvent !== 'undefined') return new CustomEvent(type, { detail });
  const event = new Event(type);
  Object.defineProperty(event, 'detail', { value: detail });
  return event;
}

async function commonsPost(handler, body) {
  const response = await handler(new Request('https://example.test/api/v1/house/commons', {
    method: 'POST',
    headers: {
      authorization: 'Bearer smoke-house-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }));
  invariant(response.status === 201, `Commons POST returned ${response.status}`);
  return response.json();
}

async function commonsRead(handler) {
  const response = await handler(new Request('https://example.test/api/v1/house/commons', {
    headers: { authorization: 'Bearer smoke-house-token' },
  }));
  invariant(response.status === 200, `Commons GET returned ${response.status}`);
  return response.json();
}

export async function runArcsweepRuntimeProductionSmoke() {
  const storage = memoryStorage();
  const target = new EventTarget();
  const world = {
    schema: 'arcsweep.runtime-world-context/v1',
    context_id: 'runtime-world:terra-prime:production-smoke',
    identity_anchor: { world_id: 'terra-prime', world_birth_receipt_id: 'world-born:terra-prime' },
    world: { id: 'terra-prime', name: 'Terra Prime', kind: 'waking-world' },
    authority: { source: 'arcsweep-active-world-state', runtime_context_is_canon_commit: false },
  };

  const booted = await bootstrapRuntimeIntegration({
    storage,
    target,
    readWorld: async () => world,
    readPresence: () => [{ voice_id: 'atlas', state: 'ready' }],
  });
  invariant(booted.world?.identity_anchor?.world_id === 'terra-prime', 'Terra Prime did not bind at bootstrap');
  invariant(booted.presence?.atlas === 'ready', 'Atlas initial presence was not carried into the envelope');

  publishModelPresence({
    voiceId: 'atlas',
    displayName: 'Atlas',
    state: 'thinking',
    provider: 'huggingface',
    model: 'atlas-smoke-model',
    worldId: 'terra-prime',
    runtimeWorldContextId: world.context_id,
    task: 'production-smoke',
  }, target);

  let envelope = loadRuntimeIntegrationEnvelope(storage);
  invariant(envelope?.presence?.atlas === 'thinking', 'Model Presence Bus did not update persisted runtime presence');

  const store = commonsStore();
  const handler = createHouseCommonsHandler({
    store,
    env: { get(name) { return name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'smoke-house-token' : null; } },
    clock: () => new Date('2026-08-21T18:50:00.000Z'),
    idFactory: (() => { let n = 0; return () => `smoke-entry-${++n}`; })(),
  });

  const steward = await commonsPost(handler, {
    kind: 'steward',
    author: 'Rowan',
    text: 'Production smoke: report runtime braid state.',
    thread_id: 'smoke-thread-1',
    turn_id: 'smoke-turn-1',
    world,
  });
  invariant(steward.thread_id === 'smoke-thread-1', 'Commons did not persist the steward thread');

  const voice = await commonsPost(handler, {
    kind: 'voice',
    author: 'Atlas',
    voice_id: 'atlas',
    status: 'replied',
    text: 'Runtime braid is visible.',
    thread_id: 'smoke-thread-1',
    reply_to: steward.id,
    turn_id: 'smoke-turn-1',
    world,
    runtime: {
      provider: 'huggingface',
      model: 'atlas-smoke-model',
      route: 'atlas',
      profile_id: 'house:atlas:huggingface:atlas-smoke-model',
      latency_ms: 81,
      runtime_world_context_id: world.context_id,
    },
  });
  invariant(voice.runtime?.runtime_world_context_id === world.context_id, 'Commons lost runtime World provenance');

  const commons = await commonsRead(handler);
  invariant(commons.entries?.length === 2, 'Commons live read did not return both smoke entries');
  invariant(commons.entries.some((entry) => entry.voice_id === 'atlas'), 'Commons live read lost the model reply');

  target.dispatchEvent(detailEvent(CONSTELLATION_LENS_EVENTS.response, {
    requestId: 'production-smoke-1',
    voiceId: 'atlas',
    voiceLabel: 'Atlas',
    kind: 'observation',
    text: voice.text,
    provider: voice.runtime?.provider,
    model: voice.runtime?.model,
    latencyMs: voice.runtime?.latency_ms,
    worldId: 'terra-prime',
    runtimeWorldContextId: world.context_id,
    citedSources: [voice.id, steward.id],
    createdAt: '2026-08-21T18:50:01.000Z',
  }));

  envelope = loadRuntimeIntegrationEnvelope(storage);
  invariant(envelope?.feedback?.length === 1, 'Commons/model response did not enter the runtime feedback ledger');
  invariant(envelope.feedback[0].voice_id === 'atlas', 'Runtime feedback lost Atlas attribution');
  invariant(envelope.feedback[0].supporting_receipts.includes(voice.id), 'Runtime feedback lost Commons reply provenance');
  invariant(envelope.feedback[0].supporting_receipts.includes(steward.id), 'Runtime feedback lost Commons steward provenance');

  const reloaded = await bootstrapRuntimeIntegration({
    storage,
    target: new EventTarget(),
    readWorld: async () => world,
    readPresence: () => [],
  });
  invariant(reloaded.session_id === envelope.session_id, 'Reload changed the runtime session identity');
  invariant(reloaded.feedback?.length === 1, 'Reload lost runtime feedback');
  invariant(reloaded.world?.identity_anchor?.world_id === 'terra-prime', 'Reload lost Terra Prime binding');

  const replay = buildRuntimeReplayReceipt(reloaded, {
    replayId: 'production-smoke-replay-1',
    reason: 'production-smoke',
    createdAt: '2026-08-21T18:50:02.000Z',
  });
  const restored = restoreEnvelopeFromReplay(replay);
  invariant(runtimeReplayEquivalent(reloaded, restored), 'Deterministic replay did not reconstruct the runtime envelope');

  return {
    ok: true,
    world_id: reloaded.world.identity_anchor.world_id,
    session_id: reloaded.session_id,
    commons_entries: commons.entries.length,
    presence: reloaded.presence,
    feedback_count: reloaded.feedback.length,
    replay_id: replay.replay_id,
  };
}

const invokedDirectly = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invokedDirectly) {
  runArcsweepRuntimeProductionSmoke()
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
