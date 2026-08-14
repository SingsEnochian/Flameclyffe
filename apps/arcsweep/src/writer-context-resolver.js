import { resolveVoiceCells } from './knowledge-bank-loader.js';
import { resolveKnowledgeSubjectCells } from './knowledge-subject-loader.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { loadState } from './storage.js';
import { expandWorldIds, normaliseWorldId } from './world-id-aliases.js';

const SELECTION_KEY = 'arcsweep.constellation-selection/v1';
const READY_EVENT = 'arcsweep:writer-context-ready';
const ERROR_EVENT = 'arcsweep:writer-context-error';
const SELECTION_EVENT = 'arcsweep:constellation-selection-changed';
const LEARNED_CELL_TYPE = 'model_observation';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseVoiceList(value) {
  if (Array.isArray(value)) return unique(value.map((item) => String(item).trim().toLowerCase()));
  return unique(String(value || '').split(',').map((item) => item.trim().toLowerCase()));
}

export function getSelectedConstellationVoices() {
  const fromBody = typeof document !== 'undefined'
    ? parseVoiceList(document.body?.dataset.constellationVoices)
    : [];
  if (fromBody.length) return fromBody;
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem(SELECTION_KEY) || '[]');
    return parseVoiceList(stored);
  } catch {
    return [];
  }
}

export function setSelectedConstellationVoices(voiceIds = []) {
  const selected = parseVoiceList(voiceIds);
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(SELECTION_KEY, JSON.stringify(selected)); } catch {}
  }
  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.constellationVoices = selected.join(',');
    document.dispatchEvent(new CustomEvent(SELECTION_EVENT, { detail: { voiceIds: selected } }));
  }
  return selected;
}

function fieldCellTypes(fieldContext = {}) {
  const field = fieldContext.field || {};
  const label = String(field.label || '').toLowerCase();
  const type = String(field.type || '').toLowerCase();
  const narrative = type === 'rich-text' || type === 'textarea' || /prose|content|description|history|notes|dialogue|script|scene/.test(label);
  const relationship = /relationship|bond|dyad|kin|family|ally|enemy|companion/.test(label);
  const canon = /canon|source|provenance|status|continuity/.test(label);
  const temporal = /date|time|age|year|era|timeline|chronology/.test(label) || /date|time/.test(type);

  if (relationship) return ['identity', 'relationship', 'boundary', 'thinking_pattern', 'open_question', LEARNED_CELL_TYPE];
  if (canon || temporal) return ['identity', 'boundary', 'relationship', 'continuity_event', 'shared_doctrine', 'open_question', LEARNED_CELL_TYPE];
  if (narrative) return ['identity', 'thinking_pattern', 'speaking_pattern', 'preference', 'boundary', 'drift_marker', 'relationship', 'shared_doctrine', 'open_question', LEARNED_CELL_TYPE];
  return ['identity', 'thinking_pattern', 'preference', 'boundary', 'relationship', 'shared_doctrine', LEARNED_CELL_TYPE];
}

function subjectCellTypes(kind) {
  if (kind === 'character') {
    return [
      'identity', 'speaking_pattern', 'thinking_pattern', 'preference', 'boundary', 'relationship',
      'character_knowledge', 'character_motivation', 'character_state', 'chronology', LEARNED_CELL_TYPE,
    ];
  }
  if (kind === 'narrative_voice') {
    return [
      'identity', 'writing_style_rule', 'thinking_pattern', 'speaking_pattern', 'preference',
      'boundary', 'sensory_voice', 'drift_marker', LEARNED_CELL_TYPE,
    ];
  }
  if (kind === 'writing_style') {
    return ['writing_style_rule', 'preference', 'boundary', 'sensory_voice', 'drift_marker', LEARNED_CELL_TYPE];
  }
  return [LEARNED_CELL_TYPE];
}

function requestedMode(fieldContext = {}) {
  if (typeof document === 'undefined') return fieldContext.mode || 'writing';
  return document.body?.dataset.constellationMode || fieldContext.mode || 'writing';
}

function findDocument(state, documentId) {
  if (!state || !documentId) return null;
  const script = (state.scripts || []).find((item) => item.id === documentId);
  if (script) return { kind: 'script', value: script };
  for (const [roomId, records] of Object.entries(state.records || {})) {
    const record = (records || []).find((item) => item.id === documentId);
    if (record) return { kind: roomId, value: record };
  }
  return null;
}

function splitIds(value) {
  if (Array.isArray(value)) return unique(value.map((item) => String(item).trim().toLowerCase()));
  return unique(String(value || '').split(',').map((item) => item.trim().toLowerCase()));
}

function subjectSpecs(page = {}) {
  const specs = [];
  if (page.writingStyleId) specs.push({ kind: 'writing_style', id: String(page.writingStyleId).toLowerCase(), label: page.writingStyleLabel || page.writingStyleId });
  if (page.narrativeVoiceId) specs.push({ kind: 'narrative_voice', id: String(page.narrativeVoiceId).toLowerCase(), label: page.narrativeVoiceLabel || page.narrativeVoiceId });
  if (page.povCharacterId) specs.push({ kind: 'character', id: String(page.povCharacterId).toLowerCase(), label: page.povCharacterLabel || page.povCharacterId });
  for (const id of splitIds(page.sceneCharacterIds)) {
    specs.push({ kind: 'character', id, label: id });
  }
  const seen = new Set();
  return specs.filter((subject) => {
    const key = `${subject.kind}:${subject.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function hydrateWriterFieldContext(fieldContext, { stateLoader } = {}) {
  const hydrated = structuredClone(fieldContext || {});
  hydrated.page = { ...(hydrated.page || {}) };
  hydrated.form = { ...(hydrated.form || {}) };
  const loader = stateLoader || (typeof document !== 'undefined' ? loadState : null);
  if (typeof loader !== 'function') return hydrated;

  try {
    const state = await loader();
    const documentId = hydrated.page.documentId || hydrated.form.recordId || null;
    const found = findDocument(state, documentId);
    const rawWorldId = hydrated.page.worldId
      || found?.value?.worldId
      || (hydrated.form.id === 'world-registry-form' ? documentId : null)
      || state.activeWorldId
      || null;
    const worldAliases = expandWorldIds(rawWorldId);
    const world = (state.worlds || []).find((item) => worldAliases.includes(String(item.id || '').toLowerCase()))
      || (state.worlds || []).find((item) => item.id === state.activeWorldId)
      || null;

    hydrated.page.documentId = documentId;
    hydrated.page.documentKind = found?.kind || null;
    hydrated.page.worldId = normaliseWorldId(rawWorldId);
    hydrated.page.worldIdAliases = worldAliases;
    hydrated.page.worldName = hydrated.page.worldName || world?.name || null;
    hydrated.page.activeWorldId = normaliseWorldId(state.activeWorldId) || null;
    hydrated.page.storyAt = hydrated.page.storyAt || found?.value?.storyAt || found?.value?.chronologyAt || found?.value?.date || null;
    hydrated.page.povCharacterId = hydrated.page.povCharacterId || found?.value?.povCharacterId || found?.value?.pov_character_id || null;
    hydrated.page.narrativeVoiceId = hydrated.page.narrativeVoiceId || found?.value?.narrativeVoiceId || found?.value?.narrative_voice_id || null;
    hydrated.page.writingStyleId = hydrated.page.writingStyleId || found?.value?.writingStyleId || found?.value?.writing_style_id || null;
    hydrated.page.sceneCharacterIds = hydrated.page.sceneCharacterIds || found?.value?.sceneCharacterIds || found?.value?.scene_character_ids || [];
  } catch {
    // Context hydration is best-effort. The field packet remains valid with local form data only.
  }
  return hydrated;
}

export async function buildWriterContextPacket(fieldContext, options = {}) {
  const hydratedFieldContext = options.resolveLocalState === false
    ? fieldContext
    : await hydrateWriterFieldContext(fieldContext, { stateLoader: options.stateLoader });
  const selected = parseVoiceList(options.voiceIds?.length ? options.voiceIds : getSelectedConstellationVoices());
  const cellTypes = options.cellTypes || fieldCellTypes(hydratedFieldContext);
  const mode = options.mode || requestedMode(hydratedFieldContext);
  const voiceContexts = [];
  const subjectContexts = [];
  const worldId = hydratedFieldContext.page?.worldId || null;
  const worldIds = hydratedFieldContext.page?.worldIdAliases?.length
    ? hydratedFieldContext.page.worldIdAliases
    : expandWorldIds(worldId);
  const storyAt = options.at || hydratedFieldContext.page?.storyAt || null;

  for (const voiceId of selected) {
    const resolved = await resolveVoiceCells(voiceId, {
      cellTypes,
      mode,
      worldId,
      worldIds,
      documentId: hydratedFieldContext.page?.documentId || null,
      sceneId: hydratedFieldContext.page?.sceneId || null,
      at: storyAt,
      includeHistorical: Boolean(options.includeHistorical),
      requireScopedContext: true,
      limit: options.perVoiceLimit || 36,
    });

    voiceContexts.push({
      voiceId: resolved.voiceId,
      displayName: resolved.displayName,
      availability: resolved.cells.length ? 'context-ready' : 'no-indexed-cells',
      cells: resolved.cells,
      learnedCellCount: resolved.learnedCellCount || 0,
    });
  }

  for (const subject of subjectSpecs(hydratedFieldContext.page)) {
    const resolved = await resolveKnowledgeSubjectCells(subject, {
      cellTypes: subjectCellTypes(subject.kind),
      mode,
      worldId,
      worldIds,
      documentId: hydratedFieldContext.page?.documentId || null,
      sceneId: hydratedFieldContext.page?.sceneId || null,
      at: storyAt,
      includeHistorical: Boolean(options.includeHistorical),
      requireScopedContext: true,
      limit: options.perSubjectLimit || 40,
    });
    subjectContexts.push({
      kind: resolved.subject.kind,
      id: resolved.subject.id,
      label: resolved.label,
      availability: resolved.cells.length ? 'context-ready' : 'no-indexed-cells',
      cells: resolved.cells,
      localCellCount: resolved.localCellCount || 0,
    });
  }

  return {
    contract: 'arcsweep.writer-context-packet/v2',
    requestId: options.requestId || globalThis.crypto?.randomUUID?.() || `writer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    mode,
    fieldContext: hydratedFieldContext,
    selection: {
      requestedVoiceIds: selected,
      resolvedVoiceIds: voiceContexts.map((voice) => voice.voiceId),
      subjects: subjectContexts.map((subject) => ({ kind: subject.kind, id: subject.id })),
    },
    activation: {
      cellTypes,
      worldIds,
      storyAt,
      includeHistorical: Boolean(options.includeHistorical),
      perVoiceLimit: options.perVoiceLimit || 36,
      perSubjectLimit: options.perSubjectLimit || 40,
    },
    voices: voiceContexts,
    subjects: subjectContexts,
    rules: {
      sourceDocumentsRemainAuthoritative: true,
      noSilentFieldMutation: true,
      noRawChainOfThought: true,
      unavailableVoiceMayNotBeImpersonated: true,
      modelInferenceMayNotOverrideStableCore: true,
      localLearningRequiresUserKeepAction: true,
      characterKnowledgeMustRespectTemporalScope: true,
      narrativeVoiceMayShapeProseButMayNotGrantCharacterKnowledge: true,
      subjectKindsRemainDistinct: true,
    },
  };
}

async function handleLensRequest(event) {
  const fieldContext = event.detail;
  if (!fieldContext?.field?.key) return;
  try {
    const packet = await buildWriterContextPacket(fieldContext);
    document.dispatchEvent(new CustomEvent(READY_EVENT, { detail: packet }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent(ERROR_EVENT, {
      detail: {
        contract: 'arcsweep.writer-context-error/v1',
        fieldKey: fieldContext.field.key,
        message: error?.message || String(error),
      },
    }));
  }
}

export function installWriterContextResolver() {
  if (typeof document === 'undefined') return;
  document.addEventListener(CONSTELLATION_LENS_EVENTS.request, handleLensRequest);
}

export const WRITER_CONTEXT_EVENTS = Object.freeze({
  ready: READY_EVENT,
  error: ERROR_EVENT,
  selectionChanged: SELECTION_EVENT,
});

export const WRITER_CONTEXT_SELECTION_KEY = SELECTION_KEY;

if (typeof document !== 'undefined') installWriterContextResolver();
