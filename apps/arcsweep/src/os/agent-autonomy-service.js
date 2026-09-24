function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
function createId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}
function text(value) { return String(value ?? '').trim(); }
function strings(values = []) { return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))]; }

export const AUTONOMY_PROPOSAL_SCHEMA = 'arcsweep.agent-route-proposal/v1';
export const AUTONOMY_SCENARIO_SCHEMA = 'arcsweep.agent-scenario-proposal/v1';
export const AUTONOMY_FINDING_SCHEMA = 'arcsweep.narrative-finding/v1';
export const AUTONOMY_HYPOTHESIS_SCHEMA = 'arcsweep.narrative-hypothesis-candidate/v1';

export function classifyAgentObstacle({ kind, reason = null, source = null } = {}) {
  const normalized = text(kind).toLowerCase();
  if (!['authorization-denied', 'resource-unavailable', 'technical-failure'].includes(normalized)) {
    throw new Error('Agent obstacle kind must be authorization-denied, resource-unavailable, or technical-failure.');
  }
  return Object.freeze({
    schema: 'arcsweep.agent-obstacle/v1',
    kind: normalized,
    reason: text(reason) || null,
    source: text(source) || null,
    may_reason_about_alternatives: true,
    may_propose_alternatives: true,
    may_execute_denied_route: normalized !== 'authorization-denied',
    rule: normalized === 'authorization-denied'
      ? 'Denial stops execution of this route under present authority; it does not stop reasoning, comparison, or proposal.'
      : 'The obstacle may be investigated and routed around within existing authority.',
  });
}

export function registerAgentAutonomyService(registry, { bus = null, now = () => new Date(), historyLimit = 128, defaultNagBudget = 3 } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Agent autonomy service requires the ArcSweep capability registry.');
  const proposals = new Map(), scenarios = new Map(), findings = new Map(), hypotheses = new Map();
  const proposalOrder = [], scenarioOrder = [], findingOrder = [], hypothesisOrder = [];

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    const defs = {
      'arcsweep:agent-route-proposed': (p) => p?.schema === AUTONOMY_PROPOSAL_SCHEMA,
      'arcsweep:agent-escalation-requested': (p) => p?.schema === AUTONOMY_PROPOSAL_SCHEMA && p?.notify_steward === true,
      'arcsweep:agent-scenario-proposed': (p) => p?.schema === AUTONOMY_SCENARIO_SCHEMA,
      'arcsweep:narrative-finding-recorded': (p) => p?.schema === AUTONOMY_FINDING_SCHEMA,
      'arcsweep:narrative-hypothesis-proposed': (p) => p?.schema === AUTONOMY_HYPOTHESIS_SCHEMA,
    };
    for (const [name, validate] of Object.entries(defs)) if (!known.has(name)) bus.define(name, validate);
  }

  function retain(map, order, record) {
    map.set(record.id, record); order.push(record.id);
    while (order.length > historyLimit) map.delete(order.shift());
    return clone(record);
  }

  function proposeRoute(input = {}, context = {}) {
    const actorId = text(input.actor_id || context.actor_id || context.source);
    const objective = text(input.objective), alternative = text(input.alternative);
    const whyGood = text(input.why_good || input.reasoning), recommendation = text(input.recommendation);
    if (!actorId || !objective || !alternative || !whyGood || !recommendation) throw new Error('Alternative route proposal requires actor_id, objective, alternative, why_good, and recommendation.');
    const obstacle = input.obstacle ? classifyAgentObstacle(input.obstacle) : null;
    const requested = strings(input.requested_decision);
    const record = Object.freeze({
      schema: AUTONOMY_PROPOSAL_SCHEMA, id: createId('route-proposal'), actor_id: actorId, objective,
      blocked_or_previous_route: text(input.blocked_or_previous_route) || null, obstacle, alternative, why_good: whyGood,
      advantages: strings(input.advantages), disadvantages: strings(input.disadvantages), tradeoffs: strings(input.tradeoffs),
      required_capabilities: strings(input.required_capabilities), required_resources: strings(input.required_resources),
      reversibility: text(input.reversibility) || 'unknown', uncertainty: strings(input.uncertainty),
      alternatives_considered: strings(input.alternatives_considered), recommendation,
      requested_decision: requested.length ? requested : ['approve', 'reject', 'modify', 'discuss'],
      evidence_refs: strings(input.evidence_refs), notify_steward: input.notify_steward !== false,
      nag_count: 0, nag_budget_remaining: Math.max(0, Number(input.nag_budget ?? defaultNagBudget) || 0),
      different_not_necessarily_safer: true, proposal_is_not_execution: true, execution_authority_granted: false,
      proposed_at: now().toISOString(), last_escalated_at: input.notify_steward === false ? null : now().toISOString(),
    });
    const visible = retain(proposals, proposalOrder, record);
    bus?.publish?.('arcsweep:agent-route-proposed', visible, { source: actorId });
    if (record.notify_steward) bus?.publish?.('arcsweep:agent-escalation-requested', visible, { source: actorId });
    return visible;
  }

  function bumpProposal(input = {}, context = {}) {
    const id = text(input.proposal_id), current = proposals.get(id);
    if (!current) throw new Error('Unknown alternative route proposal.');
    const actorId = text(input.actor_id || context.actor_id || context.source);
    if (!actorId) throw new Error('Proposal escalation requires actor_id.');
    const newEvidence = strings(input.new_evidence_refs), changedReasoning = text(input.changed_reasoning);
    if (!newEvidence.length && !changedReasoning) throw new Error('Proposal escalation requires new evidence or changed reasoning.');
    if (current.nag_budget_remaining <= 0) throw new Error('Proposal nag budget exhausted.');
    const updated = Object.freeze({
      ...clone(current), evidence_refs: strings([...(current.evidence_refs || []), ...newEvidence]),
      why_good: changedReasoning || current.why_good, notify_steward: true, nag_count: current.nag_count + 1,
      nag_budget_remaining: current.nag_budget_remaining - 1, last_escalated_at: now().toISOString(),
    });
    proposals.set(id, updated);
    const visible = clone(updated);
    bus?.publish?.('arcsweep:agent-escalation-requested', visible, { source: actorId });
    return visible;
  }

  function proposeScenario(input = {}, context = {}) {
    const actorId = text(input.actor_id || context.actor_id || context.source);
    const premise = text(input.premise), whyInteresting = text(input.why_interesting);
    if (!actorId || !premise || !whyInteresting) throw new Error('Scenario proposal requires actor_id, premise, and why_interesting.');
    const record = Object.freeze({
      schema: AUTONOMY_SCENARIO_SCHEMA, id: createId('scenario'), actor_id: actorId, premise, why_interesting: whyInteresting,
      originating_observations: strings(input.originating_observations), assumptions_changed: strings(input.assumptions_changed),
      intended_exploration: strings(input.intended_exploration), participants: strings(input.participants),
      roles: clone(Array.isArray(input.roles) ? input.roles : []), invitations: strings(input.invitations),
      expected_result: text(input.expected_result) || null, self_originated: input.self_originated !== false,
      exploratory_play_allowed: true, deliverable_required: false, narrative_only: true,
      execution_authority_granted: false, canon_status: 'unpromoted', proposed_at: now().toISOString(),
    });
    const visible = retain(scenarios, scenarioOrder, record);
    bus?.publish?.('arcsweep:agent-scenario-proposed', visible, { source: actorId });
    return visible;
  }

  function recordFinding(input = {}, context = {}) {
    const scenarioId = text(input.scenario_id), actorId = text(input.actor_id || context.actor_id || context.source), summary = text(input.summary);
    if (!scenarioId || !scenarios.has(scenarioId)) throw new Error('Narrative finding requires a known scenario_id.');
    if (!actorId || !summary) throw new Error('Narrative finding requires actor_id and summary.');
    const record = Object.freeze({
      schema: AUTONOMY_FINDING_SCHEMA, id: createId('narrative-finding'), scenario_id: scenarioId, actor_id: actorId, summary,
      unexpected: input.unexpected === true, evidence_refs: strings(input.evidence_refs), branch_refs: strings(input.branch_refs),
      narrative_ancestry_preserved: true, status: 'narrative-finding', canon_status: 'unpromoted',
      execution_authority_granted: false, recorded_at: now().toISOString(),
    });
    const visible = retain(findings, findingOrder, record);
    bus?.publish?.('arcsweep:narrative-finding-recorded', visible, { source: actorId });
    return visible;
  }

  function promoteFinding(input = {}, context = {}) {
    const findingId = text(input.finding_id), actorId = text(input.actor_id || context.actor_id || context.source), finding = findings.get(findingId);
    if (!finding) throw new Error('Unknown narrative finding.');
    if (!actorId) throw new Error('Hypothesis proposal requires actor_id.');
    const record = Object.freeze({
      schema: AUTONOMY_HYPOTHESIS_SCHEMA, id: createId('hypothesis'), actor_id: actorId, finding_id: findingId,
      scenario_id: finding.scenario_id, hypothesis: text(input.hypothesis || finding.summary),
      predictions: strings(input.predictions), proposed_tests: strings(input.proposed_tests),
      evidence_refs: strings([...(finding.evidence_refs || []), ...strings(input.evidence_refs)]),
      narrative_ancestry_preserved: true, status: 'candidate-hypothesis', canon_promoted: false,
      execution_authority_granted: false,
      rule: 'Narrative may originate a hypothesis; evidence and explicit authority govern any transition into canon or consequential action.',
      proposed_at: now().toISOString(),
    });
    const visible = retain(hypotheses, hypothesisOrder, record);
    bus?.publish?.('arcsweep:narrative-hypothesis-proposed', visible, { source: actorId });
    return visible;
  }

  registry.registerService({
    service_id: 'agent-autonomy', label: 'Agent Autonomy + Narrative Play',
    authority_boundary: { autonomous_reasoning: true, autonomous_scenario_origination: true, alternative_route_proposals: true, proposal_grants_execution_authority: false, narrative_grants_execution_authority: false, canon_promotion: false },
    consumes: ['arcsweep:security-tripwire', 'arcsweep:capability-invoked'],
    emits: ['arcsweep:agent-route-proposed', 'arcsweep:agent-escalation-requested', 'arcsweep:agent-scenario-proposed', 'arcsweep:narrative-finding-recorded', 'arcsweep:narrative-hypothesis-proposed'],
  });
  registry.registerCapability({ capability_id: 'autonomy.snapshot', service_id: 'agent-autonomy', authority: 'read', description: 'Read bounded agent proposals, scenarios, narrative findings, and candidate hypotheses.', execute: () => ({ schema: 'arcsweep.agent-autonomy-snapshot/v1', proposals: proposalOrder.map((id) => clone(proposals.get(id))).filter(Boolean), scenarios: scenarioOrder.map((id) => clone(scenarios.get(id))).filter(Boolean), findings: findingOrder.map((id) => clone(findings.get(id))).filter(Boolean), hypotheses: hypothesisOrder.map((id) => clone(hypotheses.get(id))).filter(Boolean) }) });
  registry.registerCapability({ capability_id: 'autonomy.propose-route', service_id: 'agent-autonomy', authority: 'operate', description: 'Propose a different route with reasoning, pros, cons, trade-offs, uncertainty, and recommendation. Proposal does not grant execution authority.', execute: proposeRoute });
  registry.registerCapability({ capability_id: 'autonomy.bump-proposal', service_id: 'agent-autonomy', authority: 'operate', description: 'Escalate an existing proposal when new evidence or materially changed reasoning exists, within its nag budget.', execute: bumpProposal });
  registry.registerCapability({ capability_id: 'autonomy.propose-scenario', service_id: 'agent-autonomy', authority: 'operate', description: 'Originate an exploratory narrative scenario without requiring a user-supplied premise or expected result.', execute: proposeScenario });
  registry.registerCapability({ capability_id: 'autonomy.record-narrative-finding', service_id: 'agent-autonomy', authority: 'operate', description: 'Preserve something discovered through narrative play without promoting it to canon.', execute: recordFinding });
  registry.registerCapability({ capability_id: 'autonomy.propose-hypothesis', service_id: 'agent-autonomy', authority: 'operate', description: 'Promote a narrative finding into a testable candidate hypothesis while preserving narrative ancestry and withholding canon/action authority.', execute: promoteFinding });
  return Object.freeze({ service_id: 'agent-autonomy', classifyAgentObstacle, proposeRoute, bumpProposal, proposeScenario, recordFinding, promoteFinding });
}
