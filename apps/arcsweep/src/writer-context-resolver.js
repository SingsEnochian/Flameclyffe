import { resolveVoiceCells } from './knowledge-bank-loader.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { loadState } from './storage.js';

const SELECTION_KEY = 'arcsweep.constellation-selection/v1';
const READY_EVENT = 'arcsweep:writer-context-ready';
const ERROR_EVENT = 'arcsweep:writer-context-error';
const SELECTION_EVENT = 'arcsweep:constellation-selection-changed';

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

  if (relationship) return ['identity', 'relationship', 'boundary', 'thinking_pattern', 'open_question'];
  if (canon || temporal) return ['identity', 'boundary', 'relationship', 'continuity_event', 'shared_doctrine', 'open_question'];
  if (narrative) return ['identity', 'thinking_pattern', 'speaking_pattern', 'preference', 'boundary', 'drift_marker', 'relationship', 'shared_doctrine', 'open_question'];
  return ['identity', 'thinking_pattern', 'preference', 'boundary', 'relationship', 'shared_doctrine'];
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

export async function hydrateWriterFieldContext(fieldContext, { stateLoader = loadState } = {}) {
  const hydrated = structuredClone(fieldContext || {});
  hydrated.page = { ...(hydrated.page || {}) };
  hydrated.form = { ...(hydrated.form || {}) };
  if (typeof document === 'undefined' || typeof stateLoader !== 'function') return hydrated;

  try {
    const state = await stateLoader();
    const documentId = hydrated.page.documentId || hydrated.form.recordId || null;
    const found = findDocument(state, documentId);
    const worldId = hydrated.page.worldId
      || found?.value?.worldId
      || (hydrated.form.id === 'world-registry-form' ? documentId : null)
      || state.activeWorldId
      || null;
    const world = (state.worlds || []).find((item) => item.id === worldId) || null;

    hydrated.page.documentId = documentId;
    hydrated.page.documentKind = found?.kind || null;
    hydrated.page.worldId = worldId;
    hydrated.page.worldName = hydrated.page.worldName || world?.name || null;
    hydrated.page.activeWorldId = state.activeWorldId || null;
  } catch {
    // Context hydration is best-effort. The field packet remains valid with local form data only.
  }
  return hydrated;
}

export async function buildWriterContextPacket(fieldContext, options = {}) {
  const hydratedFieldContext = options.resolveLocalState === false
    ? fieldContext
    : await hydrateWriterFieldContext(fieldContext, { stateLoader: options.stateLoader || loadState });
  const selected = parseVoiceList(options.voiceIds?.length ? options.voiceIds : getSelectedConstellationVoices());
  const cellTypes = options.cellTypes || fieldCellTypes(hydratedFieldContext);
  const mode = options.mode || requestedMode(hydratedFieldContext);
  const voiceContexts = [];

  for (const voiceId of selected) {
    const resolved = await resolveVoiceCells(voiceId, {
      cellTypes,
      mode,
      worldId: hydratedFieldContext.page?.worldId || null,
      documentId: hydratedFieldContext.page?.documentId || null,
      sceneId: hydratedFieldContext.page?.sceneId || null,
      at: options.at || null,
      includeHistorical: Boolean(options.includeHistorical),
      limit: options.perVoiceLimit || 36,
    });

    voiceContexts.push({
      voiceId: resolved.voiceId,
      displayName: resolved.displayName,
      availability: resolved.cells.length ? 'context-ready' : 'no-indexed-cells',
      cells: resolved.cells,
    });
  }

  return {
    contract: 'arcsweep.writer-context-packet/v1',
    requestId: options.requestId || globalThis.crypto?.randomUUID?.() || `writer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    mode,
    fieldContext: hydratedFieldContext,
    selection: {
      requestedVoiceIds: selected,
      resolvedVoiceIds: voiceContexts.map((voice) => voice.voiceId),
    },
    activation: {
      cellTypes,
      includeHistorical: Boolean(options.includeHistorical),
      perVoiceLimit: options.perVoiceLimit || 36,
    },
    voices: voiceContexts,
    rules: {
      sourceDocumentsRemainAuthoritative: true,
      noSilentFieldMutation: true,
      noRawChainOfThought: true,
      unavailableVoiceMayNotBeImpersonated: true,
      modelInferenceMayNotOverrideStableCore: true,
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
