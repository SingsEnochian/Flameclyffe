import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { createVisibleResponseSignature } from './visible-response-correspondence.js';
import { createVisibleSemanticProjection, normaliseSemanticEnvelope } from './visible-semantic-projection.js';

function cleanRationale(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 900);
}

export function buildSemanticProjectionPrompt(text = '', { includeRationale = false } = {}) {
  return [
    'ARCSWEEP · VISIBLE RESPONSE SEMANTIC PROJECTION',
    'Project only the meaning of the visible response below into a tiny structured record.',
    'Do not provide chain-of-thought, hidden reasoning, private scratch work, or step-by-step internal deliberation.',
    'Return STRICT JSON only with this shape:',
    includeRationale
      ? '{"intent":"short-label","concepts":["short-label"],"stance":"short-label","affect":["short-label"],"uncertainty":0.0,"rationale":"brief shareable summary"}'
      : '{"intent":"short-label","concepts":["short-label"],"stance":"short-label","affect":["short-label"],"uncertainty":0.0}',
    'Rules:',
    '- intent: one short functional label such as observe, advise, question, propose, refuse, affirm, critique, narrate, or clarify.',
    '- concepts: at most 10 short concept labels that are actually expressed in the visible response.',
    '- stance: one short label describing the response stance toward its subject, or neutral.',
    '- affect: at most 6 short tone/affect labels evident in the visible response.',
    '- uncertainty: 0 means the visible response is presented with low uncertainty; 1 means high uncertainty.',
    includeRationale
      ? '- rationale: at most 2 concise sentences summarising the visible considerations/evidence behind the answer. This is deliberately shareable rationale, not hidden chain-of-thought.'
      : '- do not include a rationale field.',
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
  return Object.freeze({
    envelope: normaliseSemanticEnvelope(parsed),
    rationale: cleanRationale(parsed.rationale),
  });
}

export async function evaluateVisibleSemanticProjection({
  voiceId,
  text,
  requestId = null,
  worldContext = null,
  includeRationale = false,
  invoke = invokeConstellationRuntimeVoice,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!String(voiceId || '').trim()) throw new Error('SEMANTIC_PROJECTION_EVALUATOR: voiceId is required');
  if (!String(text || '').trim()) throw new Error('SEMANTIC_PROJECTION_EVALUATOR: visible response text is required');
  const signature = await createVisibleResponseSignature(text, { generatedAt });
  const result = await invoke({
    voiceId,
    message: buildSemanticProjectionPrompt(text, { includeRationale }),
    sessionId: `arcsweep-semantic-${voiceId}-${requestId || signature.visible_response_hash.slice(0, 12)}`,
    metadata: {
      purpose: 'visible-semantic-projection',
      source_visible_response_hash: signature.visible_response_hash,
      source_request_id: requestId,
      visible_rationale_requested: includeRationale === true,
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
  const parsed = parseSemanticProjectionMessage(result.message);
  const projection = await createVisibleSemanticProjection({
    visibleResponseHash: signature.visible_response_hash,
    envelope: parsed.envelope,
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
  return Object.freeze({
    status: 'projected',
    projection,
    rationale: includeRationale ? parsed.rationale : '',
    authority: Object.freeze({
      rationale_is_shareable_summary: includeRationale === true,
      rationale_is_hidden_chain_of_thought: false,
      rationale_persisted_in_projection_receipt: false,
    }),
  });
}
