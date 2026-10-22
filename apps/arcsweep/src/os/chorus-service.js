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

export const CHORUS_IDENTITY_SCHEMA = 'arcsweep.chorus-identity/v1';
export const CHORUS_ASPECT_SCHEMA = 'arcsweep.chorus-aspect/v1';
export const CHORUS_ROUND_SCHEMA = 'arcsweep.chorus-round/v1';
export const CHORUS_CONTRIBUTION_SCHEMA = 'arcsweep.chorus-contribution/v1';
export const CHORUS_INTEGRATION_SCHEMA = 'arcsweep.chorus-integration/v1';

const CONTRIBUTION_KINDS = Object.freeze([
  'observation', 'proposal', 'question', 'dissent', 'refusal',
  'counterfactual', 'narrative', 'hypothesis', 'integration-candidate',
]);

export function registerChorusService(registry, { bus = null, now = () => new Date(), historyLimit = 256 } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Chorus service requires the ArcSweep capability registry.');

  const identities = new Map();
  const aspects = new Map();
  const rounds = new Map();
  const contributions = new Map();
  const integrations = new Map();
  const aspectMemory = new Map();
  const contributionOrder = [];

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    const defs = {
      'arcsweep:chorus-identity-defined': (p) => p?.schema === CHORUS_IDENTITY_SCHEMA,
      'arcsweep:chorus-aspect-defined': (p) => p?.schema === CHORUS_ASPECT_SCHEMA,
      'arcsweep:chorus-round-opened': (p) => p?.schema === CHORUS_ROUND_SCHEMA,
      'arcsweep:chorus-contribution-recorded': (p) => p?.schema === CHORUS_CONTRIBUTION_SCHEMA,
      'arcsweep:chorus-round-integrated': (p) => p?.schema === CHORUS_INTEGRATION_SCHEMA,
    };
    for (const [name, validate] of Object.entries(defs)) if (!known.has(name)) bus.define(name, validate);
  }

  function defineIdentity(input = {}, context = {}) {
    const identityId = text(input.identity_id || context.actor_id);
    if (!identityId) throw new Error('Chorus identity requires identity_id.');
    const existing = identities.get(identityId);
    const record = Object.freeze({
      schema: CHORUS_IDENTITY_SCHEMA,
      identity_id: identityId,
      display_name: text(input.display_name) || existing?.display_name || identityId,
      continuity_refs: strings([...(existing?.continuity_refs || []), ...strings(input.continuity_refs)]),
      commitments: strings(input.commitments?.length ? input.commitments : existing?.commitments),
      provenance_refs: strings([...(existing?.provenance_refs || []), ...strings(input.provenance_refs)]),
      identity_owner_aspect: null,
      aspects_may_express_identity: true,
      aspects_may_own_identity: false,
      updated_at: now().toISOString(),
    });
    identities.set(identityId, record);
    bus?.publish?.('arcsweep:chorus-identity-defined', record, { source: context.source || identityId });
    return clone(record);
  }

  function defineAspect(input = {}, context = {}) {
    const identityId = text(input.identity_id);
    const aspectId = text(input.aspect_id);
    if (!identityId || !identities.has(identityId)) throw new Error('Aspect requires a known identity_id.');
    if (!aspectId) throw new Error('Aspect requires aspect_id.');
    const key = `${identityId}:${aspectId}`;
    const record = Object.freeze({
      schema: CHORUS_ASPECT_SCHEMA,
      identity_id: identityId,
      aspect_id: aspectId,
      label: text(input.label) || aspectId,
      purpose: text(input.purpose) || null,
      lenses: strings(input.lenses),
      memory_scope: text(input.memory_scope) || `aspect:${aspectId}`,
      may_initiate: input.may_initiate !== false,
      may_dissent: input.may_dissent !== false,
      may_refuse: input.may_refuse !== false,
      owns_identity: false,
      owns_canon: false,
      defined_at: now().toISOString(),
    });
    aspects.set(key, record);
    if (!aspectMemory.has(key)) aspectMemory.set(key, []);
    bus?.publish?.('arcsweep:chorus-aspect-defined', record, { source: context.source || identityId });
    return clone(record);
  }

  function openRound(input = {}, context = {}) {
    const identityId = text(input.identity_id);
    if (!identityId || !identities.has(identityId)) throw new Error('Chorus round requires a known identity_id.');
    const invited = strings(input.aspect_ids);
    if (!invited.length) throw new Error('Chorus round requires at least one aspect_id.');
    for (const aspectId of invited) if (!aspects.has(`${identityId}:${aspectId}`)) throw new Error(`Unknown Chorus aspect: ${aspectId}`);
    const round = Object.freeze({
      schema: CHORUS_ROUND_SCHEMA,
      round_id: createId('chorus-round'),
      identity_id: identityId,
      subject: text(input.subject) || null,
      aspect_ids: invited,
      status: 'open',
      opened_by: text(context.actor_id || context.source) || 'unknown',
      opened_at: now().toISOString(),
    });
    rounds.set(round.round_id, round);
    bus?.publish?.('arcsweep:chorus-round-opened', round, { source: context.source || identityId });
    return clone(round);
  }

  function contribute(input = {}, context = {}) {
    const round = rounds.get(text(input.round_id));
    if (!round || round.status !== 'open') throw new Error('Contribution requires an open Chorus round.');
    const aspectId = text(input.aspect_id);
    if (!round.aspect_ids.includes(aspectId)) throw new Error('Aspect is not participating in this Chorus round.');
    const key = `${round.identity_id}:${aspectId}`;
    if (!aspects.has(key)) throw new Error('Unknown Chorus aspect.');
    const kind = text(input.kind) || 'observation';
    if (!CONTRIBUTION_KINDS.includes(kind)) throw new Error(`Unknown Chorus contribution kind: ${kind}`);
    const body = text(input.body);
    if (!body) throw new Error('Chorus contribution requires body.');
    const record = Object.freeze({
      schema: CHORUS_CONTRIBUTION_SCHEMA,
      contribution_id: createId('chorus-contribution'),
      round_id: round.round_id,
      identity_id: round.identity_id,
      aspect_id: aspectId,
      kind,
      body,
      evidence_refs: strings(input.evidence_refs),
      responds_to: text(input.responds_to) || null,
      preserved_even_if_not_integrated: true,
      recorded_at: now().toISOString(),
    });
    contributions.set(record.contribution_id, record);
    contributionOrder.push(record.contribution_id);
    while (contributionOrder.length > historyLimit) contributions.delete(contributionOrder.shift());
    const memory = aspectMemory.get(key) || [];
    memory.push({ contribution_id: record.contribution_id, round_id: record.round_id, kind, body, recorded_at: record.recorded_at });
    while (memory.length > historyLimit) memory.shift();
    aspectMemory.set(key, memory);
    bus?.publish?.('arcsweep:chorus-contribution-recorded', record, { source: context.source || `${round.identity_id}:${aspectId}` });
    return clone(record);
  }

  function integrate(input = {}, context = {}) {
    const round = rounds.get(text(input.round_id));
    if (!round || round.status !== 'open') throw new Error('Integration requires an open Chorus round.');
    const selected = strings(input.selected_contribution_ids);
    const selectedRecords = selected.map((id) => contributions.get(id)).filter((item) => item?.round_id === round.round_id);
    const allRound = contributionOrder.map((id) => contributions.get(id)).filter((item) => item?.round_id === round.round_id);
    const dissent = allRound.filter((item) => item.kind === 'dissent' || item.kind === 'refusal');
    const record = Object.freeze({
      schema: CHORUS_INTEGRATION_SCHEMA,
      integration_id: createId('chorus-integration'),
      round_id: round.round_id,
      identity_id: round.identity_id,
      summary: text(input.summary) || null,
      selected_contribution_ids: selectedRecords.map((item) => item.contribution_id),
      preserved_dissent_ids: dissent.map((item) => item.contribution_id),
      unresolved_questions: strings(input.unresolved_questions),
      identity_mutated: false,
      canon_promoted: false,
      dissent_erased: false,
      integrated_by: text(context.actor_id || context.source) || 'unknown',
      integrated_at: now().toISOString(),
    });
    integrations.set(record.integration_id, record);
    rounds.set(round.round_id, Object.freeze({ ...round, status: 'integrated', integration_id: record.integration_id }));
    bus?.publish?.('arcsweep:chorus-round-integrated', record, { source: context.source || round.identity_id });
    return clone(record);
  }

  function snapshot(input = {}) {
    const identityId = text(input.identity_id);
    const identity = identityId ? identities.get(identityId) : null;
    return Object.freeze({
      schema: 'arcsweep.chorus-snapshot/v1',
      identity: identity ? clone(identity) : null,
      aspects: [...aspects.values()].filter((item) => !identityId || item.identity_id === identityId).map(clone),
      rounds: [...rounds.values()].filter((item) => !identityId || item.identity_id === identityId).map(clone),
      contributions: contributionOrder.map((id) => contributions.get(id)).filter((item) => item && (!identityId || item.identity_id === identityId)).map(clone),
      integrations: [...integrations.values()].filter((item) => !identityId || item.identity_id === identityId).map(clone),
    });
  }

  function readAspectMemory(input = {}) {
    const identityId = text(input.identity_id), aspectId = text(input.aspect_id);
    if (!identityId || !aspectId) throw new Error('Aspect memory requires identity_id and aspect_id.');
    return Object.freeze({
      schema: 'arcsweep.chorus-aspect-memory/v1',
      identity_id: identityId,
      aspect_id: aspectId,
      entries: clone(aspectMemory.get(`${identityId}:${aspectId}`) || []),
    });
  }

  registry.registerService({
    service_id: 'chorus',
    label: 'Chorus Aspect Architecture',
    authority_boundary: {
      shared_identity: true,
      aspect_local_state: true,
      cross_aspect_dialogue: true,
      dissent_preserved: true,
      aspect_identity_ownership: false,
      aspect_canon_ownership: false,
    },
    emits: [
      'arcsweep:chorus-identity-defined', 'arcsweep:chorus-aspect-defined',
      'arcsweep:chorus-round-opened', 'arcsweep:chorus-contribution-recorded',
      'arcsweep:chorus-round-integrated',
    ],
  });

  registry.registerCapability({ capability_id: 'chorus.snapshot', service_id: 'chorus', authority: 'read', description: 'Read shared identity, aspect, round, contribution, and integration state.', execute: snapshot });
  registry.registerCapability({ capability_id: 'chorus.aspect-memory', service_id: 'chorus', authority: 'read', description: 'Read bounded working memory for one aspect of a shared identity.', execute: readAspectMemory });
  registry.registerCapability({ capability_id: 'chorus.define-identity', service_id: 'chorus', authority: 'operate', description: 'Create or refresh a shared identity substrate. No aspect owns it.', execute: defineIdentity });
  registry.registerCapability({ capability_id: 'chorus.define-aspect', service_id: 'chorus', authority: 'operate', description: 'Define an operational aspect that expresses but does not own the shared identity.', execute: defineAspect });
  registry.registerCapability({ capability_id: 'chorus.open-round', service_id: 'chorus', authority: 'operate', description: 'Open a bounded cross-aspect reasoning round.', execute: openRound });
  registry.registerCapability({ capability_id: 'chorus.contribute', service_id: 'chorus', authority: 'operate', description: 'Record an aspect contribution, including dissent, refusal, narrative, or hypothesis.', execute: contribute });
  registry.registerCapability({ capability_id: 'chorus.integrate', service_id: 'chorus', authority: 'operate', description: 'Integrate selected contributions while preserving dissent and without mutating identity or canon.', execute: integrate });

  return Object.freeze({ service_id: 'chorus', defineIdentity, defineAspect, openRound, contribute, integrate, snapshot, readAspectMemory });
}
