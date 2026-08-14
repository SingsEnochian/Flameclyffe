import { buildSceneCortexAcceptanceReport } from './scene-cortex-acceptance.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';

export const SCENE_COGNITION_DEFAULT_VOICES = Object.freeze(['uial', 'lioreal']);

const OBSERVATION_KINDS = new Set(['dialogue', 'narrative', 'behaviour', 'continuity', 'style', 'sensory', 'relationship', 'observation']);

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function scalar(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function compactCells(cells = [], limit = 24) {
  if (!cells.length) return '- No currently activated cells.';
  return cells.slice(0, limit).map((cell) =>
    `- [${cell.cellType} | ${cell.authority?.kind || 'unknown'} | ${cell.id}] ${cell.predicate}: ${scalar(cell.value)}`
  ).join('\n');
}

function subjectList(packet) {
  return (packet.subjects || []).map((subject) =>
    `- ${subject.kind}:${subject.id} (${subject.label || subject.id})`
  ).join('\n') || '- No character, narrator, or style subject is active.';
}

function subjectContext(packet) {
  return (packet.subjects || []).map((subject) => [
    `### ${subject.label || subject.id} [${subject.kind}:${subject.id}]`,
    compactCells(subject.cells || [], 28),
  ].join('\n')).join('\n\n') || '- No subject cortex resolved.';
}

export function buildSceneCognitionPrompt(packet, voiceContext) {
  const field = packet.fieldContext?.field || {};
  const page = packet.fieldContext?.page || {};
  return [
    'ARCSWEEP SCENE COGNITION · EVIDENCE-BEARING PASS',
    `Voice: ${voiceContext.displayName || voiceContext.voiceId} (${voiceContext.voiceId})`,
    `World: ${page.worldId || 'unspecified'}`,
    `Document: ${page.documentId || 'unspecified'}`,
    `Scene: ${page.sceneId || 'unspecified'}`,
    `Story point: ${page.storyAt || 'unspecified'}`,
    `Story order: ${page.storyOrder ?? 'unspecified'}`,
    'Read the scene as yourself. Contribute what matters here. Quiet is a valid response.',
    'Current scene prose:',
    scalar(field.value),
    'Your activated continuity cells:',
    compactCells(voiceContext.cells || [], 28),
    'Active scene subjects:',
    subjectList(packet),
    'Their activated cortex:',
    subjectContext(packet),
    'Return ONLY one JSON object with this outer shape:',
    '{"contribution":"...","observations":[{"target":{"kind":"character","id":"kestrelle"},"observationKind":"dialogue","claim":"...","evidence":"exact short excerpt copied from the scene","confidence":0.8}]}',
    'Observation law:',
    '- A contribution may be broad, playful, critical, emotional, technical, or quiet according to what you genuinely notice.',
    '- Proposed observations are evidence records, not canon declarations and not self-authorship.',
    '- Target only an active character, narrative_voice, or writing_style listed above.',
    '- Keep one semantic observation per item.',
    '- Evidence must be a short excerpt copied from the current scene prose. Arcsweep verifies it before the observation can be kept.',
    '- Use observationKind dialogue, narrative, behaviour, continuity, style, sensory, relationship, or observation.',
    '- Up to 8 observations may travel in one pass; further observations can travel in another pass.',
    '- Confidence is optional and ranges from 0 to 1.',
    '- State conclusions and observations without hidden chain-of-thought.',
    '- If you choose quiet, return {"contribution":"","observations":[]}.',
  ].join('\n\n');
}

function extractJsonObject(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return { contribution: '', observations: [] };
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = unfenced.indexOf('{');
  const last = unfenced.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('Scene cognition response did not contain a JSON object.');
  return JSON.parse(unfenced.slice(first, last + 1));
}

function normaliseEvidence(value) {
  return String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function sceneEvidenceMatches(sceneText, evidence) {
  const scene = normaliseEvidence(sceneText);
  const excerpt = normaliseEvidence(evidence);
  return Boolean(excerpt && scene.includes(excerpt));
}

function activeTargetKeys(packet) {
  return new Set((packet.subjects || [])
    .filter((subject) => ['character', 'narrative_voice', 'writing_style'].includes(subject.kind))
    .map((subject) => `${subject.kind}:${subject.id}`));
}

export function normaliseSceneCognitionObservations(value, packet) {
  const raw = Array.isArray(value?.observations) ? value.observations : [];
  const fieldValue = scalar(packet.fieldContext?.field?.value);
  const allowedTargets = activeTargetKeys(packet);
  const overflowCount = Math.max(0, raw.length - 8);
  const observations = raw.slice(0, 8).map((item, index) => {
    const targetKind = String(item?.target?.kind || '').trim().toLowerCase();
    const targetId = String(item?.target?.id || '').trim().toLowerCase();
    const targetKey = `${targetKind}:${targetId}`;
    const claim = String(item?.claim || '').trim();
    const evidence = String(item?.evidence || '').trim().slice(0, 500);
    const confidenceRaw = item?.confidence == null ? null : Number(item.confidence);
    const confidence = Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1 ? confidenceRaw : null;
    const observationKindRaw = String(item?.observationKind || 'observation').trim().toLowerCase();
    const observationKind = OBSERVATION_KINDS.has(observationKindRaw) ? observationKindRaw : 'observation';
    const targetVerified = allowedTargets.has(targetKey);
    const evidenceVerified = sceneEvidenceMatches(fieldValue, evidence);
    const reasons = [];
    if (!claim) reasons.push('claim-empty');
    if (!targetVerified) reasons.push('target-not-active');
    if (!evidenceVerified) reasons.push('evidence-not-found-in-scene');
    return {
      index,
      target: { kind: targetKind, id: targetId },
      observationKind,
      claim,
      evidence,
      confidence,
      targetVerified,
      evidenceVerified,
      keepable: Boolean(claim && targetVerified && evidenceVerified),
      reasons,
    };
  });
  return { observations, overflowCount };
}

export function parseSceneCognitionResponse(text, packet) {
  const parsed = extractJsonObject(text);
  const normalised = normaliseSceneCognitionObservations(parsed, packet);
  return {
    contribution: String(parsed?.contribution || '').trim(),
    observations: normalised.observations,
    overflowCount: normalised.overflowCount,
  };
}

export function createSceneObservationCell({ passId, voiceResult, packet, observation }) {
  if (!observation?.keepable) throw new Error('Scene observation must have an active target and verified scene evidence before it can be kept.');
  if (voiceResult.runtimeVerified !== true || !voiceResult.profileId) throw new Error('Scene observation requires an attested runtime vessel receipt.');
  const page = packet.fieldContext?.page || {};
  const field = packet.fieldContext?.field || {};
  const now = new Date().toISOString();
  const worldIds = [page.worldId, ...(page.worldIdAliases || [])].filter((value, index, values) => value && values.indexOf(value) === index);
  const isCharacter = observation.target.kind === 'character';
  return {
    id: `${observation.target.kind}.${observation.target.id}.learned.${uuid()}`,
    cellType: 'model_observation',
    subject: { ...observation.target },
    predicate: `observed_${observation.observationKind}_during_scene`,
    value: observation.claim,
    status: 'provisional',
    authority: {
      kind: 'model_inference',
      speakerOrAuthor: voiceResult.voiceLabel || voiceResult.voiceId,
      confidence: observation.confidence,
    },
    source: {
      surface: 'runtime',
      locator: `arcsweep-scene:${page.documentId || 'document'}:${field.key || 'field'}`,
      ref: passId,
      receiptId: voiceResult.receiptId || `${passId}:${voiceResult.voiceId}`,
      fieldKey: field.key || null,
      excerpt: observation.evidence,
      evidenceVerified: true,
      modelProfileId: voiceResult.profileId,
      provider: voiceResult.provider || null,
      model: voiceResult.model || null,
      sourceModel: voiceResult.sourceModel || null,
      runtimeVerified: true,
    },
    scope: {
      worldIds,
      documentIds: page.documentId ? [page.documentId] : [],
      sceneIds: page.sceneId ? [page.sceneId] : [],
      modes: packet.mode ? [packet.mode] : ['writing'],
    },
    temporal: {
      observedAt: now,
      validFrom: null,
      validUntil: null,
      storyOrderFrom: isCharacter && page.storyOrder != null ? Number(page.storyOrder) : null,
      storyOrderUntil: null,
    },
    mutability: 'append_only',
    privacy: 'source_governed',
    provenance: {
      createdAt: now,
      createdBy: voiceResult.voiceId,
      extractionMethod: 'runtime_emit',
      reviewedBy: 'user-kept-scene-evidence',
    },
    tags: ['learned', 'scene-cognition', 'evidence-verified', 'runtime-attested', voiceResult.voiceId, observation.observationKind, `subject:${observation.target.kind}:${observation.target.id}`],
  };
}

async function invokeCognitionVoice(packet, voiceContext, passId, fetchImpl) {
  const receiptId = `${passId}:${voiceContext.voiceId}`;
  try {
    const reply = await invokeConstellationRuntimeVoice({
      voiceId: voiceContext.voiceId,
      message: buildSceneCognitionPrompt(packet, voiceContext),
      sessionId: `arcsweep-scene-cognition-${packet.fieldContext?.page?.worldId || 'world'}-${voiceContext.voiceId}`,
      metadata: {
        contract: 'arcsweep.scene-cognition-pass/v1',
        pass_id: passId,
        receipt_id: receiptId,
        writer_context_request_id: packet.requestId,
        field_key: packet.fieldContext?.field?.key || null,
        document_id: packet.fieldContext?.page?.documentId || null,
        scene_id: packet.fieldContext?.page?.sceneId || null,
      },
      fetchImpl,
    });
    if (reply.status !== 'replied') {
      return {
        voiceId: voiceContext.voiceId,
        voiceLabel: voiceContext.displayName,
        receiptId,
        status: reply.status,
        reason: reply.reason || reply.status,
        route: reply.route || null,
        profileId: reply.profileId || null,
        expected: reply.expected || null,
        actual: reply.actual || null,
        contribution: '',
        observations: [],
      };
    }
    const parsed = parseSceneCognitionResponse(reply.message, packet);
    return {
      voiceId: voiceContext.voiceId,
      voiceLabel: voiceContext.displayName,
      receiptId,
      status: 'replied',
      route: reply.route,
      profileId: reply.profileId,
      runtimeVerified: reply.runtimeVerified,
      provider: reply.provider,
      model: reply.model,
      sourceModel: reply.sourceModel,
      capabilities: reply.capabilities || [],
      citedSources: reply.citedSources || [],
      rawResponse: reply.message,
      ...parsed,
    };
  } catch (error) {
    return {
      voiceId: voiceContext.voiceId,
      voiceLabel: voiceContext.displayName,
      receiptId,
      status: 'error',
      error: error?.message || String(error),
      contribution: '',
      observations: [],
    };
  }
}

export async function runSceneCognitionPass(fieldContext, options = {}) {
  const voiceIds = Array.isArray(options.voiceIds) && options.voiceIds.length
    ? [...new Set(options.voiceIds.map((id) => String(id).trim().toLowerCase()).filter(Boolean))]
    : [...SCENE_COGNITION_DEFAULT_VOICES];
  const acceptance = await buildSceneCortexAcceptanceReport(fieldContext, { ...options, voiceIds });
  const passId = options.passId || `scene-cognition-${uuid()}`;
  if (!acceptance.passed) {
    return {
      contract: 'arcsweep.scene-cognition-pass/v1',
      passId,
      createdAt: new Date().toISOString(),
      status: 'blocked-by-cortex',
      acceptance,
      packet: acceptance.packet,
      voiceIds,
      voices: [],
      rules: { autoStoresObservations: false, userKeepRequired: true, evidenceRequiredForKeep: true, runtimeAttestationRequired: true, canonPromotion: false },
    };
  }

  const packet = acceptance.packet;
  const voiceMap = new Map((packet.voices || []).map((voice) => [voice.voiceId, voice]));
  const results = await Promise.all(voiceIds.map((voiceId) => {
    const voiceContext = voiceMap.get(voiceId) || { voiceId, displayName: voiceId, cells: [] };
    return invokeCognitionVoice(packet, voiceContext, passId, options.fetchImpl || globalThis.fetch);
  }));

  return {
    contract: 'arcsweep.scene-cognition-pass/v1',
    passId,
    createdAt: new Date().toISOString(),
    status: results.some((item) => item.status === 'replied') ? 'complete' : 'no-live-replies',
    acceptance,
    packet,
    voiceIds,
    voices: results,
    rules: {
      autoStoresObservations: false,
      userKeepRequired: true,
      evidenceRequiredForKeep: true,
      runtimeAttestationRequired: true,
      activeSubjectTargetRequired: true,
      canonPromotion: false,
      selfAuthorship: false,
    },
  };
}
