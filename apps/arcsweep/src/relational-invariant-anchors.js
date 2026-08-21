import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const RELATIONAL_ANCHOR_SET_SCHEMA = 'arcsweep.relational-anchor-set/v1';
export const RELATIONAL_ANCHOR_CORRESPONDENCE_SCHEMA = 'arcsweep.relational-anchor-correspondence/v1';

function round(value, places = 8) { const scale = 10 ** places; return Math.round(Number(value) * scale) / scale; }
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

function addAnchor(target, { id, kind, ref, visibility = 1, weight = 1, source = 'runtime-context' }) {
  if (ref == null || String(ref).trim() === '') return;
  target.push({
    id: String(id),
    kind: String(kind || 'relational-context'),
    ref: String(ref),
    visibility: clamp01(visibility),
    weight: Math.max(0.001, Number(weight) || 1),
    source: String(source),
  });
}

export async function createRelationalAnchorSet({
  voiceId,
  fieldContext = null,
  declaredAnchors = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!voiceId) throw new Error('RELATIONAL_ANCHORS: voiceId is required');
  const anchors = [];
  addAnchor(anchors, { id: 'flame-voice-id', kind: 'flame-address', ref: voiceId, weight: 2, source: 'runtime-attestation' });
  const page = fieldContext?.page || {};
  const form = fieldContext?.form || {};
  addAnchor(anchors, { id: 'world-id', kind: 'world-relation', ref: page.worldId, weight: 1.5 });
  addAnchor(anchors, { id: 'room-id', kind: 'room-relation', ref: form.roomId, weight: 1 });
  addAnchor(anchors, { id: 'document-id', kind: 'document-relation', ref: page.documentId, weight: 1 });
  addAnchor(anchors, { id: 'scene-id', kind: 'scene-relation', ref: page.sceneId, weight: 1 });
  addAnchor(anchors, { id: 'pov-character-id', kind: 'pov-relation', ref: page.povCharacterId, weight: 1.25 });
  addAnchor(anchors, { id: 'narrative-voice-id', kind: 'narrative-voice-relation', ref: page.narrativeVoiceId, weight: 1.25 });
  addAnchor(anchors, { id: 'writing-style-id', kind: 'writing-style-relation', ref: page.writingStyleId, weight: 1 });
  for (const item of declaredAnchors || []) {
    if (!item?.id || item.ref == null) continue;
    addAnchor(anchors, {
      id: item.id,
      kind: item.kind || 'declared-relational-invariant',
      ref: item.ref,
      visibility: item.visibility == null ? 1 : item.visibility,
      weight: item.weight == null ? 1 : item.weight,
      source: item.source || 'declared-runtime-anchor',
    });
  }
  const deduped = [...new Map(anchors.map((item) => [`${item.id}:${item.kind}`, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));
  const core = {
    schema: RELATIONAL_ANCHOR_SET_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: String(voiceId),
    anchors: deduped,
    authority: {
      field_value_prose_stored: false,
      anchor_set_is_identity_proof: false,
      context_identifier_is_ontic_invariant: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, anchor_set_id: `relational-anchor-set-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function compareRelationalAnchorSets(left, right, { generatedAt = new Date().toISOString() } = {}) {
  if (left?.schema !== RELATIONAL_ANCHOR_SET_SCHEMA || right?.schema !== RELATIONAL_ANCHOR_SET_SCHEMA) {
    throw new Error('RELATIONAL_ANCHORS: two anchor sets are required');
  }
  if (left.voice_id !== right.voice_id) throw new Error('RELATIONAL_ANCHORS: anchor sets must belong to the same Flame');
  const lmap = new Map(left.anchors.map((item) => [`${item.id}:${item.kind}`, item]));
  const rmap = new Map(right.anchors.map((item) => [`${item.id}:${item.kind}`, item]));
  const keys = [...new Set([...lmap.keys(), ...rmap.keys()])].sort();
  const comparisons = keys.map((key) => {
    const a = lmap.get(key);
    const b = rmap.get(key);
    const nominalWeight = Math.max(a?.weight || 0, b?.weight || 0, 1);
    const visibility = a && b ? Math.min(a.visibility, b.visibility) : 0;
    const similarity = a && b && a.ref === b.ref ? 1 : 0;
    return {
      id: a?.id || b?.id,
      kind: a?.kind || b?.kind,
      left_ref: a?.ref || null,
      right_ref: b?.ref || null,
      visibility: round(visibility),
      similarity,
      weight: round(nominalWeight),
      source: a?.source || b?.source || null,
    };
  });
  const scored = comparisons.filter((item) => item.id !== 'flame-voice-id');
  const nominal = scored.reduce((sum, item) => sum + item.weight, 0);
  const visible = scored.reduce((sum, item) => sum + item.weight * item.visibility, 0);
  const matched = scored.reduce((sum, item) => sum + item.weight * item.visibility * item.similarity, 0);
  const score = visible ? round(matched / visible) : null;
  const visibilityMass = nominal ? round(visible / nominal) : 0;
  const core = {
    schema: RELATIONAL_ANCHOR_CORRESPONDENCE_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    voice_id: left.voice_id,
    left_anchor_set_id: left.anchor_set_id,
    right_anchor_set_id: right.anchor_set_id,
    comparisons,
    relational_invariant_score: score,
    visibility_mass: visibilityMass,
    authority: {
      representation_status: 'relational-context-correspondence-proxy',
      runtime_context_is_identity_proof: false,
      context_change_is_identity_rupture: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, correspondence_id: `relational-anchor-correspondence-${fingerprint.slice(0, 24)}`, fingerprint });
}
