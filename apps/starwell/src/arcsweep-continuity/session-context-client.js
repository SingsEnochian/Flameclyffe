import { validateSessionContext } from './session-resolver.js';

export const ARCSWEEP_SESSION_CONTEXT_KEY = 'arcsweep:session-context:active:v1';
export const ARCSWEEP_SESSION_PROMPT_SCHEMA = 'arcsweep.session-prompt-envelope/v0.1';

export function readActiveSessionEnvelope(storage = globalThis.sessionStorage) {
  if (!storage?.getItem) return null;
  try {
    const envelope = JSON.parse(storage.getItem(ARCSWEEP_SESSION_CONTEXT_KEY) || 'null');
    if (!envelope?.context) return null;
    return {
      ...envelope,
      context: validateSessionContext(envelope.context),
    };
  } catch {
    return null;
  }
}

export function readActiveSessionContext(storage = globalThis.sessionStorage) {
  return readActiveSessionEnvelope(storage)?.context ?? null;
}

export function buildSessionPromptEnvelope(contextInput) {
  const context = validateSessionContext(contextInput);
  return {
    schema: ARCSWEEP_SESSION_PROMPT_SCHEMA,
    generated_at: new Date().toISOString(),
    world_slug: context.world_slug,
    session_context_id: context.session_context_id,
    context_signature: context.context_signature,
    role: 'supplemental-reviewed-continuity',
    authority: {
      scope: 'session-context-only',
      canon_commit: false,
      external_evidence_upgrade: false,
    },
    boundaries: [...context.instructions],
    continuity_items: context.items.map((item) => ({
      continuity_item_id: item.continuity_item_id,
      text: item.text,
      layer: item.layer,
      route: item.route,
      epistemic_register: item.epistemic_register,
      source_packet_ids: [...item.source_packet_ids],
      packet_id: item.packet_id,
      review_id: item.review_id,
      authority_scope: item.authority_scope,
      canon_commit: false,
    })),
    provenance: {
      packet_ids: [...context.source.packet_ids],
      review_ids: [...context.source.review_ids],
      source_session_ids: [...context.source.source_session_ids],
      source_fingerprints: [...context.source.source_fingerprints],
    },
    persistence: {
      source: 'sessionStorage',
      durable: false,
      save_to_canon: false,
      save_to_codex: false,
    },
  };
}

export function sessionPromptEnvelopeToMarkdown(envelopeInput) {
  if (!envelopeInput || envelopeInput.schema !== ARCSWEEP_SESSION_PROMPT_SCHEMA) {
    throw new TypeError('Unsupported Arcsweep session prompt envelope');
  }
  const lines = [
    `# Arcsweep Session Context: ${envelopeInput.world_slug}`,
    '',
    `Context: ${envelopeInput.session_context_id}`,
    'Authority: supplemental reviewed continuity; canon commit false.',
    '',
    '## Boundary instructions',
    ...envelopeInput.boundaries.map((boundary) => `- ${boundary}`),
    '',
    '## Continuity items',
  ];
  for (const item of envelopeInput.continuity_items) {
    lines.push(
      `- [${item.route} · ${item.epistemic_register} · ${item.layer}] ${item.text}`,
      `  Source: ${item.packet_id} / review ${item.review_id}`,
    );
  }
  return `${lines.join('\n')}\n`;
}
