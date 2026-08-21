import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { createVisibleResponseSignature } from './visible-response-correspondence.js';
import { createVisibleSemanticProjection, normaliseSemanticEnvelope } from './visible-semantic-projection.js';

export function buildSemanticProjectionPrompt(text = '') {
  return [
    'ARCSWEEP · VISIBLE RESPONSE SEMANTIC PROJECTION',
    'Project only the meaning of the visible response below into a tiny structured record.',
    'Do not provide chain-of-thought, hidden reasoning, explanation, or commentary.',
    'Return STRICT JSON only with this shape:',
    '{"intent":"short-label","concepts":["short-label"],"stance":"short-label","affect":["short-label"],"uncertainty":0.0}',
    'Rules:',
    '- intent: one short functional label such as observe, advise, question, propose, refuse, affirm, critique, narrate, or clarify.',
    '- concepts: at most 10 short concept labels that are actually expressed in the visible response.',
    '- stance: one short label describing the response stance toward its subject, or neutral.',
    '- affect: at most 6 short tone/affect labels evident in the visible response.',
    '- uncertainty: 0 means the visible response is presented with low uncertainty; 1 means high uncertainty.',
    '- This is a model-mediated semantic projection, not ground truth and not an identity judgement.',
    'VISIBLE RESPONSE:',
    String(text || ''),
  ].join('\n\n');
}

export function parseSemanticProjectionMessage(message = '') {
  let raw = String(message || '').trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('SEMANTIC_PROJECTION_EVALUATOR: evaluator did not return a JSON object');
  const parsed = JSON.parse(raw.slice(first, last + 1));
  return normaliseSemanticEnvelope(parsed);
}

export async function evaluateVisibleSemanticProjection({
  voiceId,
  text,
  requestId = null,
  worldContext = null,
  invoke = invokeConstellationRuntimeVoice,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!String(voiceId || '').trim()) throw new Error('SEMANTIC_PROJECTION_EVALUATOR: voiceId is required');
  if (!String(text || '').trim()) throw new Error('SEMANTIC_PROJECTION_EVALUATOR: visible response text is required');
  const signature = await createVisibleResponseSignature(text, { generatedAt });
  const result = await invoke({
    voiceId,
    message: buildSemanticProjectionPrompt(text),
    sessionId: `arcsweep-semantic-${voiceId}-${requestId || signature.visible_response_hash.slice(0, 12)}`,
    metadata: {
      purpose: 'visible-semantic-projection',
      source_visible_response_hash: signature.visible_response_hash,
      source_request_id: requestId,
    },
    worldContext,
  });
  if (result?.status !== 'replied') {
    return Object.freeze({
      status: 'unavailable',
      reason: result?.reason || result?.status || 'semantic evaluator unavailable',
      visible_response_hash: signature.visible_response_hash,
    });
  }
  const envelope = parseSemanticProjectionMessage(result.message);
  const projection = await createVisibleSemanticProjection({
    visibleResponseHash: signature.visible_response_hash,
    envelope,
    evaluator: {
      mode: 'same-flame-second-pass',
      voiceId: result.voiceId || voiceId,
      provider: result.provider || null,
      model: result.model || null,
    },
    voiceId,
    requestId,
    generatedAt,
  });
  return Object.freeze({ status: 'projected', projection });
}
