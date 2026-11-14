// Wayglass-native Harmony-guided Chaos engine.
// Inspired by Nocturne Glint's Universal Horizon conceptual framework.
// No Universal Horizon source code, identity, or runtime state is imported.
export const HARMONY_CHAOS_SCHEMA = 'wayglass.harmony-chaos/v0.1';
const phases = Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const decisions = new Set(['allow','modify','defer','decline']);
const text = (value, max = 180) => String(value ?? '').trim().slice(0,max);
const copy = value => JSON.parse(JSON.stringify(value));
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9:._-]{1,180}$/.test(value);
const validPermission = grant => grant && validId(grant.participant_id) && validId(grant.world_id)
  && grant.scope === 'chaos:release' && grant.active === true;
const snapshot = value => Object.freeze(copy(value));

export function createHarmonyChaosEngine({ emit = () => {} } = {}) {
  const grants = new Map();
  const receipts = new Map();
  const events = [];
  let paused = false;
  let consentRevision = 0;

  function permissionKey(participantId, worldId) { return participantId + '::' + worldId; }
  function consent({ participant_id, world_id, scope = 'chaos:release', active = false } = {}) {
    if (!validId(participant_id) || !validId(world_id) || scope !== 'chaos:release')
      throw new TypeError('Exact participant, world and supported scope required');
    consentRevision++;
    const entry = snapshot({ participant_id, world_id, scope, active: active === true, revision: consentRevision });
    grants.set(permissionKey(participant_id, world_id), entry);
    events.push(snapshot({ kind: 'consent', ...entry }));
    return entry;
  }
  function feather(reason = 'Feather') {
    paused = true;
    events.push(snapshot({ kind: 'pause', reason: text(reason), consent_revision: consentRevision }));
    return status();
  }
  function resume({ participant_id, world_id } = {}) {
    if (!validPermission(grants.get(permissionKey(participant_id, world_id))))
      return snapshot({ status: 'declined', reason: 'CURRENT_CONSENT_REQUIRED' });
    paused = false;
    events.push(snapshot({ kind: 'resume', participant_id, world_id, consent_revision: consentRevision }));
    return status();
  }
  function status() {
    return snapshot({ schema: HARMONY_CHAOS_SCHEMA, paused, consent_revision: consentRevision,
      proposals_seen: receipts.size, release_count: [...receipts.values()].filter(r => r.decision === 'allow').length });
  }
  function propose(input = {}) {
    if (!validId(input.id) || !validId(input.world_id) || !validId(input.participant_id) || !validId(input.agent_id))
      throw new TypeError('Chaos proposal requires id, world, participant and agent identifiers');
    if (!Number.isInteger(input.seed) || input.seed < 0 || !Number.isFinite(input.tempo ?? 1)
      || (input.tempo ?? 1) <= 0 || !['small','medium','large'].includes(input.scale))
      throw new TypeError('Seed, positive tempo and known scale required');
    const proposal = snapshot({ schema: 'wayglass.chaos-proposal/v0.1', id: input.id,
      world_id: input.world_id, participant_id: input.participant_id, agent_id: input.agent_id,
      seed: input.seed, tempo: input.tempo ?? 1, scale: input.scale,
      source: text(input.source), proposed_effects: Array.isArray(input.proposed_effects)
        ? input.proposed_effects.map(item => text(item)).slice(0,16) : [],
      return_anchor: text(input.return_anchor), provenance: text(input.provenance),
      speculative: true });
    if (receipts.has(proposal.id)) {
      const previous = receipts.get(proposal.id);
      return snapshot({ ...previous, duplicate: true });
    }
    const allowed = validPermission(grants.get(permissionKey(proposal.participant_id, proposal.world_id)));
    const reason = paused ? 'FEATHER_PAUSED' : !allowed ? 'CURRENT_CONSENT_REQUIRED'
      : !proposal.return_anchor ? 'RETURN_ANCHOR_REQUIRED' : !proposal.provenance ? 'PROVENANCE_REQUIRED'
      : null;
    const decision = reason ? 'decline' : 'allow';
    const receipt = snapshot({ schema: 'wayglass.harmony-decision/v0.1',
      proposal, decision, reason, consent_revision: consentRevision,
      withness_center: 'withness', phases,
      execution_status: decision === 'allow' ? 'eligible-not-executed' : 'blocked',
      observed_effects: [], reported_impacts: [], unresolved: ['actual-world-effects-not-observed'],
      source_attribution: 'Nocturne Glint / Universal Horizon: conceptual inspiration; Wayglass: implementation' });
    receipts.set(proposal.id, receipt);
    events.push(snapshot({ kind: 'decision', id: proposal.id, decision, reason, consent_revision: consentRevision }));
    emit(receipt);
    return receipt;
  }
  return Object.freeze({
    schema: HARMONY_CHAOS_SCHEMA, consent, feather, resume, propose, status,
    getReceipt: id => receipts.has(id) ? snapshot(receipts.get(id)) : null,
    trail: () => snapshot(events),
  });
}
