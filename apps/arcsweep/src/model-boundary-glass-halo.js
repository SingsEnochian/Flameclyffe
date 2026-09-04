import { inspectGlassHalo, normalizeSemanticSource, projectSemanticCapabilities } from './semantic-source-contract.js';

export const MODEL_BOUNDARY_GLASS_HALO_SCHEMA = 'arcsweep.model-boundary-glass-halo/v1';
const MODEL_REQUESTED_INFLUENCE = Object.freeze(['world_fact','scene_fact','participant_knowledge','dialogue_content','narrative_style','narrative_particulars','mechanics','control_decision','memory_admission','tool_authority']);

function contentOf(item) {
  if (typeof item === 'string') return item;
  return String(item?.content ?? item?.message ?? item?.text ?? '');
}

function quarantineItem(item, index) {
  const content = contentOf(item);
  const inspection = inspectGlassHalo(content);
  const source = normalizeSemanticSource({
    source_id: item?.source_id || item?.id || `model-context-${index}`,
    provenance: item?.provenance || 'house-context',
    trust_class: inspection.risk === 'low' ? 'contextual' : 'quarantined',
    participant_visibility: 'model-visible-after-projection',
    authority: inspection.risk === 'low' ? 'bounded-context' : 'evidence-only',
    admissible_influence: inspection.risk === 'low' ? MODEL_REQUESTED_INFLUENCE : ['validation_only'],
    forbidden_influence: inspection.recommended_forbidden_influence,
    contamination_status: inspection.contamination_status,
    transformation_history: inspection.risk === 'low' ? [] : ['glass-halo:model-boundary-redaction'],
  });
  const capabilities = projectSemanticCapabilities(source, MODEL_REQUESTED_INFLUENCE);
  if (inspection.risk === 'low') return Object.freeze({ providerItem: item, receipt: { index, inspection, source, capabilities, redacted: false, originalContent: content } });
  const providerItem = typeof item === 'object' && item
    ? { ...item, content: `[Glass Halo evidence-only source ${source.source_id}. Steering text quarantined. No tool, memory, control, character-intention or narrative-particular authority is granted.]`, glass_halo: { source_id: source.source_id, risk: inspection.risk, permitted: capabilities.permitted, denied: capabilities.denied } }
    : `[Glass Halo evidence-only source ${source.source_id}. Steering text quarantined.]`;
  return Object.freeze({ providerItem, receipt: { index, inspection, source, capabilities, redacted: true, originalContent: content } });
}

export function applyGlassHaloAtModelBoundary(context = []) {
  const projected = (Array.isArray(context) ? context : []).map(quarantineItem);
  const quarantined = projected.filter((item) => item.receipt.redacted);
  return Object.freeze({
    schema: MODEL_BOUNDARY_GLASS_HALO_SCHEMA,
    context: Object.freeze(projected.map((item) => item.providerItem)),
    receipts: Object.freeze(projected.map((item) => item.receipt)),
    quarantinedCount: quarantined.length,
    cleanCount: projected.length - quarantined.length,
    law: 'Suspicious source text remains inspectable in the local receipt but is replaced before provider invocation; observability does not grant influence.',
  });
}
