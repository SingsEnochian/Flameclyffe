function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function bridge() {
  return globalThis.__arcsweepObserverBridge || null;
}

function readStoredSnapshot(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = globalThis.localStorage?.getItem?.(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function timelineReceipt(receipt = {}) {
  return {
    event_id: receipt.event_id || null,
    sequence: Number.isFinite(receipt.sequence) ? receipt.sequence : null,
    name: receipt.name || null,
    source: typeof receipt.meta?.source === 'string' ? receipt.meta.source.slice(0, 120) : null,
    emitted_at: receipt.emitted_at || null,
  };
}

export function registerObserverService(registry, { bus = null, timelineLimit = 64 } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Observer service requires the ArcSweep capability registry.');

  registry.registerService({
    service_id: 'observer-deep',
    label: 'Observer / DEEP Bridge',
    authority_boundary: {
      observer_source: 'read-only',
      deep_projection: 'derived-read-only',
      os_timeline: 'receipt-summary-only',
      canon_promotion: false,
      source_mutation: false,
    },
    consumes: ['hearthgate.observer.premaq'],
    emits: ['hearthgate.deep-current/v1'],
  });

  registry.registerCapability({
    capability_id: 'observer.status',
    service_id: 'observer-deep',
    description: 'Read Observer bridge connection status and schema.',
    authority: 'read',
    execute: () => {
      const current = bridge();
      return {
        available: Boolean(current),
        connected: Boolean(current?.connected),
        schema: current?.schema || null,
        storage_key: current?.storageKey || null,
      };
    },
  });

  registry.registerCapability({
    capability_id: 'observer.snapshot',
    service_id: 'observer-deep',
    description: 'Read the latest lossless Observer snapshot when available.',
    authority: 'read',
    execute: () => {
      const current = bridge();
      if (current?.getSnapshot) return clone(current.getSnapshot());
      const snapshot = readStoredSnapshot(current?.storageKey);
      if (!snapshot) throw new Error('Observer snapshot bridge is unavailable.');
      return clone(snapshot);
    },
  });

  registry.registerCapability({
    capability_id: 'observer.deep-current',
    service_id: 'observer-deep',
    description: 'Read the current derived DEEP projection with transformation receipts.',
    authority: 'read',
    execute: async () => {
      const current = bridge();
      if (current?.getDeepPayload) return clone(current.getDeepPayload());
      if (typeof globalThis.fetch !== 'function') throw new Error('Observer DEEP projection bridge is unavailable.');
      const response = await globalThis.fetch('/data/deep-current.json', { cache: 'no-store' });
      if (!response?.ok) throw new Error(`Observer DEEP projection failed: ${response?.status || 'unknown'}`);
      return clone(await response.json());
    },
  });

  registry.registerCapability({
    capability_id: 'observer.timeline',
    service_id: 'observer-deep',
    description: 'Read a bounded live timeline of ArcSweep OS event receipt headers without event payloads.',
    authority: 'read',
    execute: () => {
      const receipts = bus?.history?.() || [];
      return {
        schema: 'arcsweep.observer-os-timeline/v1',
        count: Math.min(receipts.length, timelineLimit),
        events: receipts.slice(-timelineLimit).map(timelineReceipt),
      };
    },
  });

  return Object.freeze({
    service_id: 'observer-deep',
    capabilities: ['observer.status', 'observer.snapshot', 'observer.deep-current', 'observer.timeline'],
  });
}
