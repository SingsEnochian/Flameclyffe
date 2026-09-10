function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  return Object.freeze(clone(value));
}

function createId(prefix = 'capability-call') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export const CAPABILITY_AUTHORITY = Object.freeze(['read', 'operate', 'mutate', 'admin']);

function normaliseAuthority(value = 'read') {
  if (!CAPABILITY_AUTHORITY.includes(value)) throw new Error(`Unknown capability authority: ${value}`);
  return value;
}

export function createCapabilityRegistry({ bus = null, now = () => new Date() } = {}) {
  const services = new Map();
  const capabilities = new Map();

  function registerService(input = {}) {
    const serviceId = String(input.service_id || '').trim();
    if (!serviceId) throw new Error('Capability service requires service_id.');
    if (services.has(serviceId)) throw new Error(`Capability service already registered: ${serviceId}`);
    const record = freeze({
      schema: 'arcsweep.os-service/v1',
      service_id: serviceId,
      label: input.label || serviceId,
      authority_boundary: clone(input.authority_boundary || {}),
      consumes: [...new Set(input.consumes || [])],
      emits: [...new Set(input.emits || [])],
      registered_at: now().toISOString(),
    });
    services.set(serviceId, record);
    bus?.publish?.('arcsweep:service-registered', record, { source: 'capability-registry' });
    return clone(record);
  }

  function registerCapability(input = {}) {
    const id = String(input.capability_id || '').trim();
    const serviceId = String(input.service_id || '').trim();
    if (!id) throw new Error('Capability requires capability_id.');
    if (!serviceId || !services.has(serviceId)) throw new Error(`Capability requires a registered service: ${serviceId || 'missing'}`);
    if (capabilities.has(id)) throw new Error(`Capability already registered: ${id}`);
    if (typeof input.execute !== 'function') throw new Error('Capability requires execute().');
    const record = {
      descriptor: freeze({
        schema: 'arcsweep.os-capability/v1',
        capability_id: id,
        service_id: serviceId,
        description: input.description || null,
        authority: normaliseAuthority(input.authority),
        requires_confirmation: Boolean(input.requires_confirmation),
        input_schema: clone(input.input_schema || null),
        registered_at: now().toISOString(),
      }),
      execute: input.execute,
      validate: typeof input.validate === 'function' ? input.validate : null,
    };
    capabilities.set(id, record);
    bus?.publish?.('arcsweep:capability-registered', record.descriptor, { source: 'capability-registry' });
    return clone(record.descriptor);
  }

  async function invoke(capabilityId, input = {}, context = {}) {
    const entry = capabilities.get(capabilityId);
    if (!entry) throw new Error(`Unknown ArcSweep capability: ${capabilityId}`);
    const callId = createId();
    const startedAt = now().toISOString();
    const requestedAuthority = context.authority || 'read';
    const descriptorAuthority = entry.descriptor.authority;
    const requestedRank = CAPABILITY_AUTHORITY.indexOf(requestedAuthority);
    const allowedRank = CAPABILITY_AUTHORITY.indexOf(descriptorAuthority);
    if (requestedRank < 0 || requestedRank < allowedRank) {
      const receipt = freeze({
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: callId,
        capability_id: capabilityId,
        service_id: entry.descriptor.service_id,
        status: 'rejected',
        reason: 'insufficient-authority',
        requested_authority: requestedAuthority,
        required_authority: descriptorAuthority,
        started_at: startedAt,
        completed_at: now().toISOString(),
      });
      bus?.publish?.('arcsweep:capability-invoked', receipt, { source: context.source || 'os' });
      return receipt;
    }
    if (entry.descriptor.requires_confirmation && context.confirmed !== true) {
      const receipt = freeze({
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: callId,
        capability_id: capabilityId,
        service_id: entry.descriptor.service_id,
        status: 'rejected',
        reason: 'confirmation-required',
        started_at: startedAt,
        completed_at: now().toISOString(),
      });
      bus?.publish?.('arcsweep:capability-invoked', receipt, { source: context.source || 'os' });
      return receipt;
    }
    if (entry.validate && entry.validate(input, context) !== true) {
      const receipt = freeze({
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: callId,
        capability_id: capabilityId,
        service_id: entry.descriptor.service_id,
        status: 'rejected',
        reason: 'input-validation-failed',
        started_at: startedAt,
        completed_at: now().toISOString(),
      });
      bus?.publish?.('arcsweep:capability-invoked', receipt, { source: context.source || 'os' });
      return receipt;
    }

    try {
      const output = await entry.execute(clone(input), clone(context));
      const receipt = freeze({
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: callId,
        capability_id: capabilityId,
        service_id: entry.descriptor.service_id,
        status: 'applied',
        output: clone(output),
        started_at: startedAt,
        completed_at: now().toISOString(),
      });
      bus?.publish?.('arcsweep:capability-invoked', receipt, { source: context.source || 'os' });
      return receipt;
    } catch (error) {
      const receipt = freeze({
        schema: 'arcsweep.os-capability-receipt/v1',
        call_id: callId,
        capability_id: capabilityId,
        service_id: entry.descriptor.service_id,
        status: 'failed',
        error: error?.message || String(error),
        started_at: startedAt,
        completed_at: now().toISOString(),
      });
      bus?.publish?.('arcsweep:capability-invoked', receipt, { source: context.source || 'os' });
      return receipt;
    }
  }

  return Object.freeze({
    registerService,
    registerCapability,
    invoke,
    services: () => [...services.values()].map(clone),
    capabilities: () => [...capabilities.values()].map((entry) => clone(entry.descriptor)),
    getService: (serviceId) => services.has(serviceId) ? clone(services.get(serviceId)) : null,
    getCapability: (capabilityId) => capabilities.has(capabilityId) ? clone(capabilities.get(capabilityId).descriptor) : null,
  });
}
