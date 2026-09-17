export const OBSERVER_WITNESS_SCHEMA = 'arcsweep.observer-witness/v1';
export const OBSERVER_WITNESS_STORAGE_KEY = 'hearthgate.arcsweep.observer-witness.v1';
export const OBSERVER_WITNESS_EVENT = 'arcsweep:observer-witness';
export const OBSERVER_WITNESS_CHANNEL = 'arcsweep-observer-witness-v1';
export const OBSERVER_WITNESS_LIMIT = 96;

const desktop = globalThis.arcsweepDesktop ?? globalThis.arcsweep ?? null;
let channel = null;

function clone(value) {
  if (value == null) return value;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function uid(prefix = 'observer-witness') {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}:${id}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readLocalHistory() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem?.(OBSERVER_WITNESS_STORAGE_KEY) || '[]');
    return safeArray(parsed).filter((item) => item?.schema === OBSERVER_WITNESS_SCHEMA);
  } catch {
    return [];
  }
}

function writeLocalHistory(history) {
  try {
    globalThis.localStorage?.setItem?.(OBSERVER_WITNESS_STORAGE_KEY, JSON.stringify(history.slice(-OBSERVER_WITNESS_LIMIT)));
    return true;
  } catch {
    return false;
  }
}

function getChannel() {
  if (channel || typeof globalThis.BroadcastChannel !== 'function') return channel;
  try {
    channel = new BroadcastChannel(OBSERVER_WITNESS_CHANNEL);
  } catch {
    channel = null;
  }
  return channel;
}

export function createObserverWitnessPacket({
  kind = 'snapshot',
  worldId = null,
  room = 'observer-workbench',
  semanticStatus = null,
  deepPayload = null,
  narrativeState = null,
  epistemicLedger = null,
  workspace = null,
  note = null,
  host = null,
  source = 'observer-workbench',
  parentReceiptId = null,
} = {}) {
  const createdAt = new Date().toISOString();
  return Object.freeze({
    schema: OBSERVER_WITNESS_SCHEMA,
    receipt_id: uid(),
    parent_receipt_id: parentReceiptId || null,
    created_at: createdAt,
    kind,
    source,
    world_id: worldId || workspace?.activeWorldId || null,
    room,
    host: Object.freeze({
      mode: desktop?.runtime?.desktop ? 'desktop' : 'web',
      platform: desktop?.runtime?.platform || globalThis.navigator?.platform || null,
      ...clone(host),
    }),
    observer: semanticStatus ? clone(semanticStatus) : null,
    deep: deepPayload ? {
      schema: deepPayload.schema || deepPayload.version || null,
      generated_at: deepPayload.generated_at || null,
      field: clone(deepPayload.field || null),
      provenance: clone(deepPayload.provenance || deepPayload.source || null),
      transformation_receipts: clone(deepPayload.transformation_receipts || []),
    } : null,
    narrative: narrativeState ? {
      schema: narrativeState.schema || null,
      status: narrativeState.status || null,
      phase: narrativeState.phase || null,
      claim_count: narrativeState.claims?.length || 0,
      evidence_count: narrativeState.evidence?.length || 0,
      objection_count: narrativeState.objections?.length || 0,
      risk_count: narrativeState.risks?.length || 0,
      research_gap_count: narrativeState.research_gaps?.length || 0,
      mechanism_edge_count: narrativeState.mechanism_edges?.length || 0,
    } : null,
    epistemic: epistemicLedger ? {
      schema: epistemicLedger.schema || null,
      counts: clone(epistemicLedger.counts || null),
      boundaries: clone(epistemicLedger.boundaries || null),
    } : null,
    workspace: workspace ? clone(workspace) : null,
    note: typeof note === 'string' && note.trim() ? note.trim() : null,
    authority: Object.freeze({
      witness_only: true,
      grants_authority: false,
      canon_commit: false,
      source_mutation: false,
    }),
  });
}

export async function publishObserverWitness(packet) {
  if (!packet || packet.schema !== OBSERVER_WITNESS_SCHEMA) throw new Error('Observer witness packet is invalid.');
  const history = [...readLocalHistory(), clone(packet)].slice(-OBSERVER_WITNESS_LIMIT);
  const localSaved = writeLocalHistory(history);
  let desktopResult = null;
  if (typeof desktop?.publishObserverWitness === 'function') {
    try { desktopResult = await desktop.publishObserverWitness(clone(packet)); }
    catch (error) { desktopResult = { ok: false, error: error?.message || String(error) }; }
  }
  try { getChannel()?.postMessage?.(clone(packet)); } catch {}
  try { globalThis.dispatchEvent?.(new CustomEvent(OBSERVER_WITNESS_EVENT, { detail: clone(packet) })); } catch {}
  return Object.freeze({
    ok: localSaved || desktopResult?.ok === true,
    local_saved: localSaved,
    desktop: desktopResult,
    receipt_id: packet.receipt_id,
  });
}

export async function readObserverWitnessHistory({ limit = 24 } = {}) {
  const maximum = Math.max(1, Math.min(OBSERVER_WITNESS_LIMIT, Number(limit) || 24));
  let desktopHistory = [];
  if (typeof desktop?.readObserverWitness === 'function') {
    try {
      const result = await desktop.readObserverWitness({ limit: maximum });
      desktopHistory = safeArray(result?.history);
    } catch {}
  }
  const merged = new Map();
  for (const item of [...readLocalHistory(), ...desktopHistory]) {
    if (item?.schema !== OBSERVER_WITNESS_SCHEMA || !item.receipt_id) continue;
    merged.set(item.receipt_id, item);
  }
  return [...merged.values()]
    .sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0))
    .slice(-maximum)
    .map(clone);
}

export async function observerWitnessHostStatus() {
  let desktopStatus = null;
  if (typeof desktop?.getObserverWitnessStatus === 'function') {
    try { desktopStatus = await desktop.getObserverWitnessStatus(); }
    catch (error) { desktopStatus = { ok: false, error: error?.message || String(error) }; }
  }
  return Object.freeze({
    schema: 'arcsweep.observer-witness-host-status/v1',
    mode: desktop?.runtime?.desktop ? 'desktop' : 'web',
    local_storage_available: (() => {
      try { return Boolean(globalThis.localStorage); } catch { return false; }
    })(),
    broadcast_channel_available: typeof globalThis.BroadcastChannel === 'function',
    desktop: desktopStatus,
    channel: OBSERVER_WITNESS_CHANNEL,
  });
}

export function subscribeObserverWitness(listener) {
  if (typeof listener !== 'function') throw new Error('Observer witness subscriber must be a function.');
  const eventListener = (event) => listener(clone(event.detail));
  globalThis.addEventListener?.(OBSERVER_WITNESS_EVENT, eventListener);
  const broadcast = getChannel();
  const broadcastListener = (event) => listener(clone(event.data));
  broadcast?.addEventListener?.('message', broadcastListener);
  return () => {
    globalThis.removeEventListener?.(OBSERVER_WITNESS_EVENT, eventListener);
    broadcast?.removeEventListener?.('message', broadcastListener);
  };
}
