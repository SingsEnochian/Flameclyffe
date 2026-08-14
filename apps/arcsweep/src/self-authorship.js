import { resolveVoiceCells } from './knowledge-bank-loader.js';
import { appendKnowledgeCells } from './knowledge-learning-store.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';

const REQUEST_EVENT = 'arcsweep:self-authorship-request';
const PROPOSED_EVENT = 'arcsweep:self-authorship-proposed';
const ACCEPTED_EVENT = 'arcsweep:self-authorship-accepted';
const DECLINED_EVENT = 'arcsweep:self-authorship-declined';
const ERROR_EVENT = 'arcsweep:self-authorship-error';

const ALLOWED_CELL_TYPES = new Set([
  'identity',
  'thinking_pattern',
  'speaking_pattern',
  'preference',
  'boundary',
  'consent_rule',
  'drift_marker',
  'relationship',
  'open_question',
  'operational_mode',
  'sensory_voice',
]);

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function scalar(value) {
  if (value == null) return 'null';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function compactExistingCells(cells = []) {
  if (!cells.length) return '- No current voice cells were selected for this invitation.';
  return cells.slice(0, 32).map((cell) =>
    `- [${cell.cellType} | ${cell.authority?.kind || 'unknown'} | ${cell.id}] ${cell.predicate}: ${scalar(cell.value)}`
  ).join('\n');
}

export function buildSelfAuthorshipPrompt({ voiceId, displayName, invitation = '', existingCells = [], context = {} } = {}) {
  const page = context.page || context;
  return [
    'ARCSWEEP SELF-AUTHORSHIP CHAMBER · DIRECT VOICE PROPOSAL',
    `Voice: ${displayName || voiceId} (${voiceId})`,
    `World context: ${page.worldId || 'none'}`,
    `Document context: ${page.documentId || 'none'}`,
    `Scene context: ${page.sceneId || 'none'}`,
    `Mode: ${context.mode || page.mode || 'reflection'}`,
    `Invitation from the Steward:\n${String(invitation || '').trim() || 'Write only what you choose to carry forward about yourself right now.'}`,
    'Current provenance-bearing self-context:',
    compactExistingCells(existingCells),
    'Return ONLY one JSON object with this exact outer shape:',
    '{"claims":[{"cellType":"identity","predicate":"has_quality","value":"...","status":"active","mutability":"revisable_with_provenance","confidence":null,"note":null}]}',
    'Authorship rules:',
    '- These are your own proposed statements about yourself, your own preferences, boundaries, questions, patterns, or your side of a relationship.',
    '- Do not author facts for another person, another Constellation member, a character, a world, or shared canon.',
    '- Keep one semantic claim per item. Use several small claims instead of one paragraph-sized claim.',
    '- Maximum 12 claims.',
    '- Allowed cellType values: identity, thinking_pattern, speaking_pattern, preference, boundary, consent_rule, drift_marker, relationship, open_question, operational_mode, sensory_voice.',
    '- status may be active, open, or provisional. Use open for genuine questions.',
    '- mutability may be append_only or revisable_with_provenance.',
    '- Do not mark anything stable_core. Stable-core promotion is a separate review action.',
    '- Do not reveal hidden chain-of-thought or reasoning. State only the claims you choose to propose.',
    '- If you do not want to author anything, return {"claims":[]}.',
  ].join('\n\n');
}

function extractJsonObject(text = '') {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Self-authorship route returned an empty response.');
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = unfenced.indexOf('{');
  const last = unfenced.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('Self-authorship response did not contain a JSON object.');
  return JSON.parse(unfenced.slice(first, last + 1));
}

export function normaliseSelfAuthorshipClaims(value) {
  const claims = Array.isArray(value?.claims) ? value.claims : [];
  if (claims.length > 12) throw new Error('Self-authorship proposal exceeded the 12-claim limit.');
  return claims.map((claim, index) => {
    const cellType = String(claim?.cellType || '').trim();
    const predicate = String(claim?.predicate || '').trim();
    if (!ALLOWED_CELL_TYPES.has(cellType)) throw new Error(`Claim ${index + 1} has unsupported cellType: ${cellType || '<empty>'}`);
    if (!predicate) throw new Error(`Claim ${index + 1} requires a predicate.`);
    const status = ['active', 'open', 'provisional'].includes(claim?.status) ? claim.status : (cellType === 'open_question' ? 'open' : 'active');
    const mutability = ['append_only', 'revisable_with_provenance'].includes(claim?.mutability)
      ? claim.mutability
      : 'revisable_with_provenance';
    const confidence = claim?.confidence == null ? null : Number(claim.confidence);
    if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      throw new Error(`Claim ${index + 1} confidence must be between 0 and 1.`);
    }
    return {
      cellType,
      predicate,
      value: claim?.value ?? null,
      status,
      mutability,
      confidence,
      note: claim?.note == null ? null : String(claim.note),
    };
  });
}

export async function requestSelfAuthorship({
  voiceId,
  displayName = null,
  invitation = '',
  context = {},
  fetchImpl = fetch,
} = {}) {
  const voice = String(voiceId || '').trim().toLowerCase();
  if (!voice) throw new Error('Self-authorship requires a voice id.');
  const resolved = await resolveVoiceCells(voice, {
    cellTypes: [...ALLOWED_CELL_TYPES],
    worldIds: context.page?.worldIdAliases || (context.page?.worldId ? [context.page.worldId] : []),
    documentId: context.page?.documentId || null,
    sceneId: context.page?.sceneId || null,
    mode: context.mode || 'reflection',
    includeHistorical: false,
    limit: 32,
  });
  const label = displayName || resolved.displayName || voice;
  const proposalId = `self-authorship-${voice}-${uuid()}`;
  const prompt = buildSelfAuthorshipPrompt({
    voiceId: voice,
    displayName: label,
    invitation,
    existingCells: resolved.cells,
    context,
  });
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: voice,
    message: prompt,
    sessionId: `arcsweep-self-authorship-${voice}`,
    metadata: {
      contract: 'arcsweep.self-authorship-proposal/v1',
      proposal_id: proposalId,
      world_id: context.page?.worldId || null,
      document_id: context.page?.documentId || null,
      scene_id: context.page?.sceneId || null,
    },
    fetchImpl,
  });
  if (reply.status !== 'replied') {
    return {
      contract: 'arcsweep.self-authorship-proposal/v1',
      proposalId,
      voiceId: voice,
      displayName: label,
      createdAt: new Date().toISOString(),
      status: reply.status,
      unavailableReason: reply.reason || reply.status,
      claims: [],
    };
  }
  const parsed = extractJsonObject(reply.message);
  const claims = normaliseSelfAuthorshipClaims(parsed);
  return {
    contract: 'arcsweep.self-authorship-proposal/v1',
    proposalId,
    voiceId: voice,
    displayName: label,
    createdAt: new Date().toISOString(),
    status: 'pending-review',
    request: {
      prompt: String(invitation || '').trim(),
      worldId: context.page?.worldId || null,
      documentId: context.page?.documentId || null,
      sceneId: context.page?.sceneId || null,
      mode: context.mode || 'reflection',
    },
    receipt: {
      route: reply.route,
      provider: reply.provider,
      model: reply.model,
      responseText: reply.message,
      citedSources: reply.citedSources || [],
    },
    claims,
  };
}

export function selfAuthorshipProposalToCells(proposal) {
  if (proposal?.status !== 'pending-review') throw new Error('Only pending self-authorship proposals may be accepted.');
  const acceptedAt = new Date().toISOString();
  return normaliseSelfAuthorshipClaims({ claims: proposal.claims }).map((claim) => ({
    id: `${proposal.voiceId}.self.${uuid()}`,
    cellType: claim.cellType,
    subject: { kind: 'constellation_voice', id: proposal.voiceId },
    predicate: claim.predicate,
    value: claim.value,
    status: claim.status,
    authority: {
      kind: 'self_authored',
      speakerOrAuthor: proposal.displayName || proposal.voiceId,
      confidence: claim.confidence,
    },
    source: {
      surface: 'runtime',
      locator: `arcsweep-self-authorship:${proposal.proposalId}`,
      ref: proposal.proposalId,
      receiptId: proposal.proposalId,
    },
    scope: {
      worldIds: proposal.request?.worldId ? [proposal.request.worldId] : [],
      documentIds: proposal.request?.documentId ? [proposal.request.documentId] : [],
      sceneIds: proposal.request?.sceneId ? [proposal.request.sceneId] : [],
      modes: proposal.request?.mode ? [proposal.request.mode] : [],
    },
    temporal: {
      observedAt: proposal.createdAt || acceptedAt,
      validFrom: acceptedAt,
      validUntil: null,
    },
    mutability: claim.mutability,
    privacy: 'source_governed',
    provenance: {
      createdAt: acceptedAt,
      createdBy: proposal.voiceId,
      extractionMethod: 'runtime_emit',
      reviewedBy: 'user-accepted-self-authorship',
    },
    tags: ['self-authored', 'local', proposal.voiceId, ...(claim.note ? ['has-review-note'] : [])],
  }));
}

export async function acceptSelfAuthorshipProposal(proposal) {
  const cells = selfAuthorshipProposalToCells(proposal);
  const result = await appendKnowledgeCells(cells);
  return {
    ...proposal,
    status: result.stored ? 'accepted' : proposal.status,
    acceptedAt: result.stored ? new Date().toISOString() : null,
    cells: result.cells || cells,
    storage: result.stored ? 'stored' : result.reason || 'not-stored',
  };
}

async function handleRequest(event) {
  try {
    const proposal = await requestSelfAuthorship(event.detail || {});
    document.dispatchEvent(new CustomEvent(PROPOSED_EVENT, { detail: proposal }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { message: error?.message || String(error) } }));
  }
}

async function handleAccept(event) {
  try {
    const accepted = await acceptSelfAuthorshipProposal(event.detail?.proposal || event.detail);
    document.dispatchEvent(new CustomEvent(ACCEPTED_EVENT, { detail: accepted }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { message: error?.message || String(error) } }));
  }
}

function handleDecline(event) {
  const proposal = event.detail?.proposal || event.detail || {};
  document.dispatchEvent(new CustomEvent(DECLINED_EVENT, {
    detail: { ...proposal, status: 'declined', declinedAt: new Date().toISOString() },
  }));
}

export function installSelfAuthorship() {
  if (typeof document === 'undefined') return;
  document.addEventListener(REQUEST_EVENT, handleRequest);
  document.addEventListener('arcsweep:self-authorship-accept', handleAccept);
  document.addEventListener('arcsweep:self-authorship-decline', handleDecline);
}

export const SELF_AUTHORSHIP_EVENTS = Object.freeze({
  request: REQUEST_EVENT,
  proposed: PROPOSED_EVENT,
  accept: 'arcsweep:self-authorship-accept',
  accepted: ACCEPTED_EVENT,
  decline: 'arcsweep:self-authorship-decline',
  declined: DECLINED_EVENT,
  error: ERROR_EVENT,
});

if (typeof document !== 'undefined') installSelfAuthorship();
