export const POLYPHONIC_NARRATIVE_SCHEMA = 'arcsweep.polyphonic-narrative/v1';
export const PRODUCTIVE_APOCRYPHA_STATUS = 'productive-apocrypha';

export const MNEMONIC_CHANNELS = Object.freeze([
  'archive',
  'testimony',
  'relationship',
  'place',
  'language',
  'song-sound',
  'object-artefact',
  'craft',
  'gesture',
  'body',
  'food-taste',
  'scent',
  'ritual',
  'architecture',
  'ecology',
  'story-folklore',
]);

export const NAME_KINDS = Object.freeze([
  'self-name',
  'kin-name',
  'chosen-name',
  'ritual-name',
  'title',
  'alias',
  'exonym',
  'administrative-name',
  'imposed-name',
  'translation-name',
  'recovered-name',
  'obsolete-name',
]);

const text = (value) => String(value ?? '').trim();
const clone = (value) => value == null ? value : structuredClone(value);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function buildDiegeticProvenance({
  claimId,
  worldId = null,
  hops = [],
  sourceReceipts = [],
} = {}) {
  const id = text(claimId);
  if (!id) throw new Error('POLYPHONIC_NARRATIVE: diegetic provenance requires claimId');
  const normalizedHops = hops.map((hop, index) => Object.freeze({
    order: index,
    actor_or_carrier: text(hop.actor_or_carrier || hop.actorOrCarrier) || null,
    medium: text(hop.medium) || 'unknown',
    action: text(hop.action) || 'preserved',
    language: text(hop.language) || null,
    institution: text(hop.institution) || null,
    confidence: hop.confidence == null ? null : Math.max(0, Math.min(1, Number(hop.confidence))),
    notes: text(hop.notes) || null,
  }));
  return Object.freeze({
    schema: 'arcsweep.diegetic-provenance/v1',
    claim_id: id,
    world_id: text(worldId) || null,
    hops: Object.freeze(normalizedHops),
    source_receipts: Object.freeze(sourceReceipts.map(clone)),
    rule: 'system provenance and in-world provenance remain distinct',
  });
}

export function buildNameLineage({ entityId, names = [] } = {}) {
  const id = text(entityId);
  if (!id) throw new Error('POLYPHONIC_NARRATIVE: name lineage requires entityId');
  const normalized = names.map((entry, index) => {
    const kind = text(entry.kind).toLowerCase();
    if (!NAME_KINDS.includes(kind)) throw new Error(`POLYPHONIC_NARRATIVE: unsupported name kind ${kind || '(empty)'}`);
    const value = text(entry.value);
    if (!value) throw new Error('POLYPHONIC_NARRATIVE: name lineage entries require value');
    return Object.freeze({
      id: text(entry.id) || `${id}:name:${index + 1}`,
      kind,
      value,
      language: text(entry.language) || null,
      culture: text(entry.culture) || null,
      used_by: Object.freeze(unique((entry.used_by || entry.usedBy || []).map(text))),
      authority: text(entry.authority) || 'local',
      consent: text(entry.consent) || 'unknown',
      valid_from: entry.valid_from || entry.validFrom || null,
      valid_until: entry.valid_until || entry.validUntil || null,
      replaces: text(entry.replaces) || null,
      recovers: text(entry.recovers) || null,
    });
  });
  return Object.freeze({
    schema: 'arcsweep.name-lineage/v1',
    entity_id: id,
    names: Object.freeze(normalized),
    canonical_identity_reduced_to_name: false,
  });
}

export function buildMnemonicEcology({ subjectId, channels = [] } = {}) {
  const id = text(subjectId);
  if (!id) throw new Error('POLYPHONIC_NARRATIVE: mnemonic ecology requires subjectId');
  const normalized = channels.map((entry, index) => {
    const channel = text(entry.channel).toLowerCase();
    if (!MNEMONIC_CHANNELS.includes(channel)) throw new Error(`POLYPHONIC_NARRATIVE: unsupported mnemonic channel ${channel || '(empty)'}`);
    return Object.freeze({
      id: text(entry.id) || `${id}:memory:${index + 1}`,
      channel,
      carrier: text(entry.carrier) || null,
      claim_ids: Object.freeze(unique((entry.claim_ids || entry.claimIds || []).map(text))),
      continuity: text(entry.continuity) || 'present',
      reliability: text(entry.reliability) || 'unresolved',
      notes: text(entry.notes) || null,
    });
  });
  return Object.freeze({
    schema: 'arcsweep.mnemonic-ecology/v1',
    subject_id: id,
    channels: Object.freeze(normalized),
    synthesis_required: false,
    disagreement_allowed: true,
  });
}

export function buildPalimpsestPlace({ placeId, name = null, layers = [] } = {}) {
  const id = text(placeId);
  if (!id) throw new Error('POLYPHONIC_NARRATIVE: palimpsest place requires placeId');
  const normalized = layers.map((layer, index) => Object.freeze({
    id: text(layer.id) || `${id}:layer:${index + 1}`,
    label: text(layer.label) || `Layer ${index + 1}`,
    kind: text(layer.kind) || 'historical',
    culture: text(layer.culture) || null,
    language: text(layer.language) || null,
    valid_from: layer.valid_from || layer.validFrom || null,
    valid_until: layer.valid_until || layer.validUntil || null,
    source_ids: Object.freeze(unique((layer.source_ids || layer.sourceIds || []).map(text))),
    claims: Object.freeze((layer.claims || []).map(clone)),
  }));
  return Object.freeze({
    schema: 'arcsweep.palimpsest-place/v1',
    place_id: id,
    name: text(name) || id,
    layers: Object.freeze(normalized),
    layers_may_overlap: true,
    automatic_flattening: false,
  });
}

export function preserveProductiveApocrypha({
  subjectId,
  variants = [],
  reason = null,
  reviewedBy = null,
} = {}) {
  const id = text(subjectId);
  if (!id) throw new Error('POLYPHONIC_NARRATIVE: productive apocrypha requires subjectId');
  if (!Array.isArray(variants) || variants.length < 2) throw new Error('POLYPHONIC_NARRATIVE: productive apocrypha requires at least two variants');
  const normalized = variants.map((variant, index) => Object.freeze({
    id: text(variant.id) || `${id}:variant:${index + 1}`,
    label: text(variant.label) || `Variant ${index + 1}`,
    value: clone(variant.value ?? null),
    tradition: text(variant.tradition) || null,
    source_ids: Object.freeze(unique((variant.source_ids || variant.sourceIds || []).map(text))),
    held_by: Object.freeze(unique((variant.held_by || variant.heldBy || []).map(text))),
  }));
  return Object.freeze({
    schema: 'arcsweep.productive-apocrypha/v1',
    subject_id: id,
    status: PRODUCTIVE_APOCRYPHA_STATUS,
    variants: Object.freeze(normalized),
    reason: text(reason) || null,
    reviewed_by: text(reviewedBy) || null,
    automatic_winner_selection: false,
    automatic_merge: false,
  });
}

export function evaluatePolyphonicTransition({
  participants = [],
  forcedAgreement = false,
  collapseDifference = false,
  unresolvedVariantsPreserved = true,
  canonKnowledgeLeakedToParticipants = false,
} = {}) {
  const normalized = participants.map((participant, index) => Object.freeze({
    id: text(participant.id) || `participant-${index + 1}`,
    agency_preserved: participant.agency_preserved !== false,
    voice_preserved: participant.voice_preserved !== false,
    identity_preserved: participant.identity_preserved !== false,
  }));
  const reasons = [];
  if (forcedAgreement) reasons.push('forced-agreement');
  if (collapseDifference) reasons.push('difference-collapsed');
  if (!unresolvedVariantsPreserved) reasons.push('unresolved-variants-flattened');
  if (canonKnowledgeLeakedToParticipants) reasons.push('participant-knowledge-gate-breached');
  for (const participant of normalized) {
    if (!participant.agency_preserved) reasons.push(`agency-lost:${participant.id}`);
    if (!participant.voice_preserved) reasons.push(`voice-lost:${participant.id}`);
    if (!participant.identity_preserved) reasons.push(`identity-lost:${participant.id}`);
  }
  return Object.freeze({
    schema: 'arcsweep.polyphonic-transition-evaluation/v1',
    participants: Object.freeze(normalized),
    admissible: reasons.length === 0,
    reasons: Object.freeze(reasons),
    target: 'viable-polyphony',
    maximum_coherence_is_goal: false,
  });
}

export function classifyErasure({
  id,
  targetId,
  actor = null,
  mechanism = 'unknown',
  memoryChannelsAffected = [],
  evidence = [],
  recovery = 'unknown',
} = {}) {
  const erasureId = text(id);
  const target = text(targetId);
  if (!erasureId || !target) throw new Error('POLYPHONIC_NARRATIVE: erasure requires id and targetId');
  const channels = unique(memoryChannelsAffected.map((channel) => text(channel).toLowerCase()));
  const unsupported = channels.filter((channel) => !MNEMONIC_CHANNELS.includes(channel));
  if (unsupported.length) throw new Error(`POLYPHONIC_NARRATIVE: unsupported erasure channels: ${unsupported.join(', ')}`);
  return Object.freeze({
    schema: 'arcsweep.erasure-event/v1',
    id: erasureId,
    target_id: target,
    actor: text(actor) || null,
    mechanism: text(mechanism) || 'unknown',
    memory_channels_affected: Object.freeze(channels),
    evidence: Object.freeze(evidence.map(clone)),
    recovery: text(recovery) || 'unknown',
    inferred_from_absence_only: false,
  });
}
