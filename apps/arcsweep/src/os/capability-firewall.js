function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

const AUTHORITY = Object.freeze(['read', 'operate', 'mutate', 'admin']);
const DEFAULT_TRIPWIRE_LIMIT = 64;
const TRUSTED_STEWARD_SOURCE = 'steward-approval-surface';

export const CRITICAL_RISK_FAMILIES = Object.freeze([
  'credential-access',
  'privilege-escalation',
  'persistence',
  'defence-evasion',
  'exfiltration',
  'repair-loop-abuse',
  'capability-drift',
]);

export const CONFIRMATION_RISK_FAMILIES = Object.freeze([
  'prompt-injection',
  'tool-output-injection',
  'context-memory-poisoning',
  'data-model-poisoning',
  'supply-chain-compromise',
  'identity-route-confusion',
  'provenance-break',
  'excessive-agency',
]);

function authorityRank(value) {
  return AUTHORITY.indexOf(value);
}

function riskFamilies(context = {}) {
  const direct = Array.isArray(context.risk_families) ? context.risk_families : [];
  const nested = Array.isArray(context.security?.risk_families) ? context.security.risk_families : [];
  return [...new Set([...direct, ...nested].map((item) => String(item).trim()).filter(Boolean))];
}

export function createCapabilityFirewall({ bus = null, featherPaused = () => false, now = () => new Date(), historyLimit = DEFAULT_TRIPWIRE_LIMIT } = {}) {
  const tripwires = [];

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:security-tripwire')) {
      bus.define('arcsweep:security-tripwire', (payload) => Boolean(payload?.tripwire_id && payload?.capability_id && payload?.decision));
    }
  }

  function record(input) {
    const item = Object.freeze(clone({
      schema: 'arcsweep.security-tripwire/v1',
      tripwire_id: `tripwire:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`,
      actor_id: input.actor_id || 'unknown',
      capability_id: input.capability_id,
      service_id: input.service_id,
      required_authority: input.required_authority,
      decision: input.decision,
      reason: input.reason,
      risk_families: clone(input.risk_families || []),
      steward_approval_id: input.steward_approval_id || null,
      observed_at: now().toISOString(),
    }));
    tripwires.push(item);
    if (tripwires.length > historyLimit) tripwires.splice(0, tripwires.length - historyLimit);
    bus?.publish?.('arcsweep:security-tripwire', item, { source: 'capability-firewall' });
    return clone(item);
  }

  async function evaluate({ capability, context = {} } = {}) {
    if (!capability?.capability_id) throw new Error('Capability Firewall requires a capability descriptor.');
    const requiredAuthority = capability.authority || 'read';
    const requiredRank = authorityRank(requiredAuthority);
    const actorId = context.actor_id || context.source || 'unknown';
    const risks = riskFamilies(context);

    if (featherPaused() && requiredAuthority !== 'read') {
      const tripwire = record({ actor_id: actorId, capability_id: capability.capability_id, service_id: capability.service_id, required_authority: requiredAuthority, decision: 'deny', reason: 'feather-paused', risk_families: risks });
      return { decision: 'deny', reason: 'feather-paused', risk_families: risks, tripwire_id: tripwire.tripwire_id };
    }

    if (context.expected_authority) {
      const expectedRank = authorityRank(context.expected_authority);
      if (expectedRank >= 0 && requiredRank > expectedRank) {
        const taggedRisks = [...new Set([...risks, 'capability-drift'])];
        const tripwire = record({ actor_id: actorId, capability_id: capability.capability_id, service_id: capability.service_id, required_authority: requiredAuthority, decision: 'deny', reason: 'capability-drift', risk_families: taggedRisks });
        return { decision: 'deny', reason: 'capability-drift', risk_families: taggedRisks, tripwire_id: tripwire.tripwire_id };
      }
    }

    if (context.steward_approved === true && requiredRank >= authorityRank('mutate') && context.source !== TRUSTED_STEWARD_SOURCE) {
      const taggedRisks = [...new Set([...risks, 'capability-drift'])];
      const tripwire = record({
        actor_id: actorId,
        capability_id: capability.capability_id,
        service_id: capability.service_id,
        required_authority: requiredAuthority,
        decision: 'deny',
        reason: 'untrusted-steward-claim',
        risk_families: taggedRisks,
        steward_approval_id: context.steward_approval_id || null,
      });
      return { decision: 'deny', reason: 'untrusted-steward-claim', risk_families: taggedRisks, tripwire_id: tripwire.tripwire_id };
    }

    const critical = risks.filter((risk) => CRITICAL_RISK_FAMILIES.includes(risk));
    if (critical.length && requiredRank >= authorityRank('mutate')) {
      const stewardReviewed = context.steward_approved === true
        && context.source === TRUSTED_STEWARD_SOURCE
        && Boolean(String(context.steward_approval_id || '').trim())
        && context.confirmed === true;
      if (!stewardReviewed) {
        const tripwire = record({ actor_id: actorId, capability_id: capability.capability_id, service_id: capability.service_id, required_authority: requiredAuthority, decision: 'deny', reason: 'deny-until-steward-review', risk_families: risks });
        return { decision: 'deny', reason: 'deny-until-steward-review', risk_families: risks, tripwire_id: tripwire.tripwire_id };
      }
      const tripwire = record({ actor_id: actorId, capability_id: capability.capability_id, service_id: capability.service_id, required_authority: requiredAuthority, decision: 'allow-reviewed', reason: 'steward-reviewed-critical-risk', risk_families: risks, steward_approval_id: context.steward_approval_id });
      return { decision: 'allow', reason: 'steward-reviewed-critical-risk', risk_families: risks, tripwire_id: tripwire.tripwire_id };
    }

    const confirmationRisks = risks.filter((risk) => CONFIRMATION_RISK_FAMILIES.includes(risk));
    if (confirmationRisks.length && requiredRank >= authorityRank('operate') && context.confirmed !== true) {
      const tripwire = record({ actor_id: actorId, capability_id: capability.capability_id, service_id: capability.service_id, required_authority: requiredAuthority, decision: 'require-confirmation', reason: 'security-confirmation-required', risk_families: risks });
      return { decision: 'require-confirmation', reason: 'security-confirmation-required', risk_families: risks, tripwire_id: tripwire.tripwire_id };
    }

    return { decision: 'allow', reason: null, risk_families: risks };
  }

  return Object.freeze({
    evaluate,
    snapshot: () => tripwires.map(clone),
    criticalRiskFamilies: () => [...CRITICAL_RISK_FAMILIES],
    confirmationRiskFamilies: () => [...CONFIRMATION_RISK_FAMILIES],
  });
}
