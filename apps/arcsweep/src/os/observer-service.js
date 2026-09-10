function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function bridge() {
  return globalThis.__arcsweepObserverBridge || null;
}

export function registerObserverService(registry) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Observer service requires the ArcSweep capability registry.');

  registry.registerService({
    service_id: 'observer-deep',
    label: 'Observer / DEEP Bridge',
    authority_boundary: {
      observer_source: 'read-only',
      deep_projection: 'derived-read-only',
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
      if (!current?.getSnapshot) throw new Error('Observer snapshot bridge is unavailable.');
      return clone(current.getSnapshot());
    },
  });

  registry.registerCapability({
    capability_id: 'observer.deep-current',
    service_id: 'observer-deep',
    description: 'Read the current derived DEEP projection with transformation receipts.',
    authority: 'read',
    execute: () => {
      const current = bridge();
      if (!current?.getDeepPayload) throw new Error('Observer DEEP projection bridge is unavailable.');
      return clone(current.getDeepPayload());
    },
  });

  return Object.freeze({
    service_id: 'observer-deep',
    capabilities: ['observer.status', 'observer.snapshot', 'observer.deep-current'],
  });
}
