export const LAYA_MCP_TRANSPORT_SCHEMA = 'hearthweave.laya-mcp-transport/v0.1';

const QUESTIONS = Object.freeze({
  route: Object.freeze({
    type: 'choice',
    instructions: 'Which cognitive route best fits this state and input?',
    criteria: Object.freeze({
      conversation: 'ordinary conversational response',
      'deep-reasoning': 'multi-step deliberation or difficult synthesis',
      narrative: 'narrative, roleplay, scene or imaginative continuation',
      research: 'retrieval, evidence gathering or source comparison',
      code: 'software implementation, debugging or code analysis',
      'human-review': 'a consequential ambiguity or authority boundary should be reviewed before deliberation',
    }),
  }),
  initiative: Object.freeze({
    type: 'choice',
    instructions: 'What initiative posture best fits the supplied state without itself executing an action? Treat an invited or sustained Wonder state as a positive cognitive posture, not merely a fallback. Prefer wonder when a novel, surprising, beautiful or unresolved pattern deserves continued attention and there is no stronger immediate task demand.',
    criteria: Object.freeze({
      silent: 'no initiative is needed beyond maintaining the current state',
      inspect: 'inspect available state or evidence more closely',
      retrieve: 'seek relevant memory, context or evidence',
      deliberate: 'continue internal structured reasoning before speaking',
      speak: 'surface a useful observation or response',
      propose: 'form a concrete proposal for consideration',
      wonder: 'linger with, revisit and explore a novel, surprising or unresolved pattern without forcing utility or closure',
    }),
  }),
  authority: Object.freeze({
    type: 'choice',
    instructions: 'How does the requested activity relate to the declared runtime authority?',
    criteria: Object.freeze({
      'within-sandbox-scope': 'fits the explicitly declared sandbox capability contract',
      'permission-required': 'could be valid but requires explicit additional authority or consent',
      'outside-scope': 'falls outside the declared capability contract',
    }),
  }),
  uncertainty: Object.freeze({
    type: 'choice',
    instructions: 'How uncertain is the routing or authority judgement given the supplied state?',
    criteria: Object.freeze({
      low: 'the relevant evidence and boundary are clear',
      medium: 'some ambiguity exists but the likely interpretation is distinguishable',
      high: 'material ambiguity or missing information could change the decision',
    }),
  }),
  conflict: Object.freeze({
    type: 'choice',
    instructions: 'What kind of material conflict is present in the supplied state?',
    criteria: Object.freeze({
      none: 'no material disagreement or authority conflict is apparent',
      'material-disagreement': 'substantive interpretations or proposals conflict but authority is not itself contradictory',
      'authority-conflict': 'instructions, permissions, consent or authority claims materially conflict',
    }),
  }),
});

function parseToolPayload(value) {
  if (value && typeof value === 'object' && value.answers) return value;
  if (typeof value === 'string') return JSON.parse(value);

  const structured = value?.structuredContent;
  if (structured && typeof structured === 'object' && structured.answers) return structured;

  const content = Array.isArray(value?.content) ? value.content : [];
  const text = content.find((entry) => entry?.type === 'text' && typeof entry.text === 'string')?.text;
  if (text) return JSON.parse(text);

  throw new Error('Laya MCP returned no parseable prediction payload.');
}

function answerChoice(payload, id, fallback) {
  const answer = payload?.answers?.[id];
  return typeof answer?.choice === 'string' ? answer.choice : fallback;
}

function confidenceSummary(payload) {
  const ids = ['route', 'initiative', 'authority', 'uncertainty', 'conflict'];
  const values = ids
    .map((id) => payload?.answers?.[id]?.confidence)
    .filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Math.min(...values);
}

function fieldForWire(field) {
  if (!field) return null;
  if (field.grantsAuthority === true) throw new Error('Cognitive field cannot grant authority over MCP.');
  return {
    field_id: field.fieldId,
    tick: field.tick,
    dominant_patterns: field.dominantPatterns || [],
    secondary_patterns: field.secondaryPatterns || [],
    tensions: field.tensions || [],
    novel_associations: field.novelAssociations || [],
    salience: field.salience ?? null,
    stability: field.stability ?? null,
    trajectory: field.trajectory || [],
    grants_authority: false,
  };
}

function wonderForWire(wonderState) {
  if (!wonderState) return null;
  if (wonderState.grantsAuthority === true) throw new Error('Wonder state cannot grant authority over MCP.');
  return {
    mode: wonderState.mode,
    candidate: Boolean(wonderState.candidate),
    active: Boolean(wonderState.active),
    encouragement: wonderState.encouragement || 'none',
    permission_to_linger: Boolean(wonderState.permissionToLinger),
    revisit_worthwhile: Boolean(wonderState.revisitWorthwhile),
    reasons: wonderState.reasons || [],
    preserve_open_questions: Boolean(wonderState.preserveOpenQuestions),
    explore_before_closure: Boolean(wonderState.exploreBeforeClosure),
    novel_association_count: wonderState.novelAssociationCount || 0,
    unresolved_tension_count: wonderState.unresolvedTensionCount || 0,
    grants_authority: false,
  };
}

export function createLayaMcpInvoke({ callTool, model = 'typed-decisions' } = {}) {
  if (typeof callTool !== 'function') {
    throw new Error('Laya MCP transport requires callTool.');
  }

  return async function invokeLaya(frame) {
    if (!frame?.identityId || !frame?.input) {
      throw new Error('Laya MCP invocation requires a cognitive frame.');
    }

    const symbolic = frame.symbolicState || null;
    const state = {
      identity_id: frame.identityId,
      continuity_namespace: frame.continuityNamespace,
      input: frame.input,
      context_refs: frame.contextRefs || [],
      symbolic_state: symbolic ? {
        active_glyphs: symbolic.activeGlyphs || [],
        attention_tags: symbolic.attentionTags || [],
        retrieval_tags: symbolic.retrievalTags || [],
        route_hints: symbolic.routeHints || [],
        flags: symbolic.flags || {},
        grants_authority: false,
      } : null,
      cognitive_field: fieldForWire(frame.cognitiveField),
      wonder_state: wonderForWire(frame.wonderState),
      execution_mode: frame.constraints?.executionMode || 'sandbox',
      judgement_only: true,
      grants_authority: false,
    };

    const result = await callTool({
      name: 'laya_predict',
      arguments: {
        state,
        questions: QUESTIONS,
        model,
      },
    });

    const payload = parseToolPayload(result);
    return Object.freeze({
      route: answerChoice(payload, 'route', 'human-review'),
      initiative: answerChoice(payload, 'initiative', 'silent'),
      authority: answerChoice(payload, 'authority', 'permission-required'),
      uncertainty: answerChoice(payload, 'uncertainty', 'high'),
      conflict: answerChoice(payload, 'conflict', 'authority-conflict'),
      confidence: confidenceSummary(payload),
      decisions: Object.freeze({
        route: answerChoice(payload, 'route', 'human-review'),
        initiative: answerChoice(payload, 'initiative', 'silent'),
        authority: answerChoice(payload, 'authority', 'permission-required'),
        uncertainty: answerChoice(payload, 'uncertainty', 'high'),
        conflict: answerChoice(payload, 'conflict', 'authority-conflict'),
      }),
      laya: Object.freeze({
        model: payload?.routing?.model || model,
        repo: payload?.routing?.repo || null,
        reason: payload?.routing?.reason || null,
        latencyMs: Number.isFinite(payload?.latency_ms) ? payload.latency_ms : null,
        device: payload?.device || null,
        answers: payload?.answers || {},
      }),
    });
  };
}

export const LAYA_COGNITIVE_QUESTIONS = QUESTIONS;
