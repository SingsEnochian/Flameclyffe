function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function strings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function publicRecord(record) {
  return Object.freeze(clone({
    schema: 'arcsweep.steward-approval/v1',
    request_id: record.request_id,
    actor_id: record.actor_id,
    capability_id: record.capability_id,
    authority: record.authority,
    status: record.status,
    summary: record.summary,
    input_keys: Object.keys(record.input || {}).sort(),
    evidence_refs: record.evidence_refs,
    security_flags: record.security_flags,
    dissent: record.dissent,
    rollback_plan_summary: record.rollback_plan_summary,
    requested_at: record.requested_at,
    resolved_at: record.resolved_at,
    resolution: record.resolution,
    execution: record.execution,
  }));
}

export function createStewardApprovalQueue({
  broker,
  invoke,
  getCapability,
  bus = null,
  now = () => new Date(),
  historyLimit = 64,
} = {}) {
  if (!broker?.issue || !broker?.revoke) throw new Error('Steward approval queue requires an authority broker.');
  if (typeof invoke !== 'function') throw new Error('Steward approval queue requires invoke().');
  if (typeof getCapability !== 'function') throw new Error('Steward approval queue requires getCapability().');

  const records = new Map();
  const order = [];

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:steward-approval-requested')) {
      bus.define('arcsweep:steward-approval-requested', (payload) => payload?.schema === 'arcsweep.steward-approval/v1' && payload?.status === 'pending');
    }
    if (!known.has('arcsweep:steward-approval-resolved')) {
      bus.define('arcsweep:steward-approval-resolved', (payload) => payload?.schema === 'arcsweep.steward-approval/v1' && payload?.status !== 'pending');
    }
  }

  function request(input = {}) {
    const actorId = String(input.actor_id || '').trim();
    const capabilityId = String(input.capability_id || '').trim();
    const descriptor = getCapability(capabilityId);
    if (!actorId) throw new Error('Steward approval request requires actor_id.');
    if (!descriptor) throw new Error(`Unknown capability for Steward approval: ${capabilityId || 'missing'}`);
    if (!['mutate', 'admin'].includes(descriptor.authority)) {
      throw new Error('Steward approval queue is reserved for mutate/admin capabilities.');
    }
    const authority = input.authority || descriptor.authority;
    if (authority !== descriptor.authority) throw new Error('Requested authority must match the capability authority.');
    const summary = String(input.summary || '').trim();
    if (!summary) throw new Error('Steward approval request requires a human-readable summary.');

    const record = {
      request_id: createId('steward-request'),
      actor_id: actorId,
      capability_id: capabilityId,
      authority,
      input: clone(input.input || {}),
      summary,
      evidence_refs: strings(input.evidence_refs),
      security_flags: strings(input.security_flags),
      dissent: strings(input.dissent),
      rollback_plan_summary: input.rollback_plan_summary ? String(input.rollback_plan_summary).trim() : null,
      status: 'pending',
      requested_at: now().toISOString(),
      resolved_at: null,
      resolution: null,
      execution: null,
    };
    records.set(record.request_id, record);
    order.push(record.request_id);
    if (order.length > historyLimit) {
      const removable = order.find((id) => records.get(id)?.status !== 'pending');
      if (removable) {
        records.delete(removable);
        order.splice(order.indexOf(removable), 1);
      }
    }
    const visible = publicRecord(record);
    bus?.publish?.('arcsweep:steward-approval-requested', visible, { source: 'steward-approval' });
    return visible;
  }

  async function resolveTrusted({ request_id, decision, trusted = false } = {}) {
    if (trusted !== true) throw new Error('Steward approval resolution requires a trusted human action.');
    const record = records.get(request_id);
    if (!record) throw new Error('Unknown Steward approval request.');
    if (record.status !== 'pending') return publicRecord(record);
    const choice = String(decision || '').trim().toLowerCase();
    if (!['approve', 'reject'].includes(choice)) throw new Error('Steward approval decision must be approve or reject.');

    record.resolved_at = now().toISOString();
    record.resolution = choice;
    if (choice === 'reject') {
      record.status = 'rejected';
      const visible = publicRecord(record);
      bus?.publish?.('arcsweep:steward-approval-resolved', visible, { source: 'steward-approval' });
      return visible;
    }

    let issued = null;
    try {
      issued = broker.issue({
        actor_id: record.actor_id,
        authority: record.authority,
        capability_ids: [record.capability_id],
        single_use: true,
        approved_by: 'human-steward',
      });
      const receipt = await invoke(record.capability_id, record.input, {
        actor_id: record.actor_id,
        source: 'steward-approval-surface',
        authority: record.authority,
        expected_authority: record.authority,
        authority_lease: issued.token,
        confirmed: true,
        steward_approved: true,
        steward_approval_id: record.request_id,
        risk_families: record.security_flags,
      });
      record.execution = {
        call_id: receipt?.call_id || null,
        status: receipt?.status || 'unknown',
        reason: receipt?.reason || null,
      };
      record.status = receipt?.status === 'applied' ? 'approved-applied' : 'approved-not-applied';
    } catch (error) {
      record.execution = { call_id: null, status: 'failed', reason: error?.message || String(error) };
      record.status = 'approved-not-applied';
    } finally {
      if (issued?.token) {
        const currentLease = broker.snapshot?.().find((lease) => lease.lease_id === issued.lease?.lease_id) || null;
        if (!currentLease || currentLease.status === 'active') broker.revoke(issued.token);
      }
    }

    const visible = publicRecord(record);
    bus?.publish?.('arcsweep:steward-approval-resolved', visible, { source: 'steward-approval' });
    return visible;
  }

  const publicApi = Object.freeze({
    request,
    list: ({ status = null } = {}) => order
      .map((id) => records.get(id))
      .filter(Boolean)
      .filter((record) => !status || record.status === status)
      .map(publicRecord),
    get: (requestId) => records.has(requestId) ? publicRecord(records.get(requestId)) : null,
    pendingCount: () => order.reduce((count, id) => count + (records.get(id)?.status === 'pending' ? 1 : 0), 0),
  });

  return Object.freeze({ publicApi, resolveTrusted });
}
