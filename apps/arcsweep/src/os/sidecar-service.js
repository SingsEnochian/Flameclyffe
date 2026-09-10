const DECLARED_PACKS = Object.freeze(['worlds','feedback','house','writing','worldseed','deep','forge','canon','aemeth']);

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function schedulerDiagnostics() {
  return clone(globalThis.__arcsweepSidecarDiagnostics || {
    schema: 'arcsweep.sidecar-scheduler/v1',
    loaded: [],
    failures: [],
    packs: [],
  });
}

function sidecarControl() {
  return globalThis.__arcsweepSidecarControl || null;
}

export function registerSidecarService(registry) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Sidecar service requires the ArcSweep capability registry.');

  registry.registerService({
    service_id: 'sidecar-scheduler',
    label: 'ArcSweep Sidecar Scheduler',
    authority_boundary: {
      read_diagnostics: true,
      mount_declared_pack: true,
      arbitrary_import: false,
      source_mutation: false,
    },
    consumes: ['arcsweep:sidecar-pack-request'],
    emits: ['arcsweep:sidecar-loaded', 'arcsweep:sidecar-pack-ready'],
  });

  registry.registerCapability({
    capability_id: 'sidecars.status',
    service_id: 'sidecar-scheduler',
    description: 'Read sidecar scheduler diagnostics without changing runtime state.',
    authority: 'read',
    execute: () => schedulerDiagnostics(),
  });

  registry.registerCapability({
    capability_id: 'sidecars.mount-pack',
    service_id: 'sidecar-scheduler',
    description: 'Mount one already-declared ArcSweep sidecar pack.',
    authority: 'operate',
    input_schema: { required: ['pack'] },
    validate: (input) => Boolean(input?.pack && DECLARED_PACKS.includes(input.pack)),
    execute: async (input) => {
      const control = sidecarControl();
      if (!control?.mountPack) throw new Error('ArcSweep sidecar scheduler control is unavailable.');
      const results = await control.mountPack(input.pack);
      return {
        pack: input.pack,
        failures: (results || []).filter((item) => item?.message),
        diagnostics: schedulerDiagnostics(),
      };
    },
  });

  return Object.freeze({
    service_id: 'sidecar-scheduler',
    capabilities: ['sidecars.status', 'sidecars.mount-pack'],
  });
}

export { DECLARED_PACKS as ARCSWEEP_DECLARED_SIDECAR_PACKS };
