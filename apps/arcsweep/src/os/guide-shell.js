function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

const GUIDE_CAPABILITIES = Object.freeze({
  'os.boot': Object.freeze({ authority: 'read' }),
  'os.context': Object.freeze({ authority: 'read' }),
  'os.navigate': Object.freeze({ authority: 'operate' }),
  'observer.status': Object.freeze({ authority: 'read' }),
  'observer.deep-current': Object.freeze({ authority: 'read' }),
  'security.sources': Object.freeze({ authority: 'read' }),
  'security.risk-families': Object.freeze({ authority: 'read' }),
  'security.classify-known-risk-tags': Object.freeze({ authority: 'read' }),
  'sidecars.status': Object.freeze({ authority: 'read' }),
});

export function createGuideShell({ invoke, actorId = 'guide:arcsweep' } = {}) {
  if (typeof invoke !== 'function') throw new Error('Guide shell requires a capability invocation function.');

  async function request(capabilityId, input = {}, context = {}) {
    const descriptor = GUIDE_CAPABILITIES[capabilityId];
    if (!descriptor) {
      return Object.freeze({
        schema: 'arcsweep.guide-request/v1',
        capability_id: capabilityId,
        status: 'rejected',
        reason: 'guide-capability-not-allowed',
      });
    }

    const safeContext = clone(context) || {};
    delete safeContext.authority_lease;
    delete safeContext.confirmed;
    delete safeContext.steward_reviewed;
    delete safeContext.steward_approved;
    delete safeContext.steward_approval_id;
    delete safeContext.approval_receipt;

    return invoke(capabilityId, clone(input), {
      ...safeContext,
      actor_id: actorId,
      source: 'guide-shell',
      authority: descriptor.authority,
      expected_authority: descriptor.authority,
    });
  }

  return Object.freeze({
    actor_id: actorId,
    request,
    allowedCapabilities: () => Object.entries(GUIDE_CAPABILITIES).map(([capability_id, descriptor]) => ({
      capability_id,
      authority: descriptor.authority,
    })),
  });
}
