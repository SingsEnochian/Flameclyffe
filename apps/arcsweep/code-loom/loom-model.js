/**
 * Code Loom draft and handoff contract.
 * This is a presentation/workflow layer, NOT a participant identity registry,
 * authentication service, signed receipt, remote execution engine, or canon authority.
 */
export const LOOM_SCHEMA = 'wayglass.atelier.code-loom/v0.2';
export const HANDOFF_SCHEMA = 'wayglass.atelier.agent-handoff/v0.1';
export const SEATS = Object.freeze({
  rarity: Object.freeze({ name: 'Rarity', role: 'Research, architecture, source provenance, integration review' }),
  codex: Object.freeze({ name: 'Codex', role: 'Implement, refactor, run tests, report evidence' }),
  astra: Object.freeze({ name: 'Astra', role: 'Investigate architecture and develop Wayglass-native idea leaps' }),
  'bitty-twi': Object.freeze({ name: 'Bitty Twi', role: 'Opt-in mathematical and experimental review' }),
});
export const FIELDS = Object.freeze(['source','lesson','leap','boundary','code','tests','stop_point','next_owner','wonder','evidence']);
const MAX_FIELD = 120_000;
export function cleanText(value) {
  return typeof value === 'string' ? value.slice(0,MAX_FIELD) : '';
}
export function emptyDraft() {
  return { schema: LOOM_SCHEMA, status: 'draft_unverified',
    ...Object.fromEntries(FIELDS.map(field => [field,''])), handoffs: [] };
}
export function normaliseDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return emptyDraft();
  const draft = emptyDraft();
  for (const field of FIELDS) draft[field] = cleanText(input[field]);
  draft.handoffs = Array.isArray(input.handoffs) ? input.handoffs.slice(0,30)
    .filter(item => item && typeof item === 'object' && Object.hasOwn(SEATS,item.seat))
    .map(item => ({
      seat: item.seat, assignment: cleanText(item.assignment).slice(0,12000),
      status: 'proposed_not_dispatched', // never trust imported claims of completed work
    })) : [];
  return draft;
}
export function validateDraft(input) {
  const draft = normaliseDraft(input);
  const issues = [];
  if (!draft.source.trim()) issues.push('Record the original source and author.');
  if (!draft.lesson.trim()) issues.push('Record the mechanism being learned.');
  if (!draft.leap.trim()) issues.push('Record the new Wayglass direction.');
  if (!draft.boundary.trim()) issues.push('Record licence and authority boundaries.');
  if (!draft.stop_point.trim()) issues.push('Record a stop point.');
  if (!draft.next_owner.trim()) issues.push('Name the next owner.');
  return { ok: issues.length === 0, issues, draft };
}
/**
 * Handoffs are task proposals until a real agent route acknowledges them
 * with attributable external evidence. No claim of a spawned agent.
 */
export function proposeHandoff(input, seat, assignment) {
  if (!Object.hasOwn(SEATS,seat)) throw new TypeError('unknown agent seat');
  const draft=normaliseDraft(input);
  const task=cleanText(assignment).trim();
  if (!task) throw new TypeError('assignment required');
  const handoff={schema:HANDOFF_SCHEMA,seat,assignment:task.slice(0,12000),status:'proposed_not_dispatched',
    origin:'local_atelier_draft',source:draft.source,mechanism:draft.lesson,wayglass_leap:draft.leap,
    boundary:draft.boundary,stop_point:draft.stop_point,next_owner:draft.next_owner,
    wonder:draft.wonder,tests:draft.tests,evidence:draft.evidence};
  return handoff;
}
export function promptForAgent(packet) {
  if (!packet || packet.schema !== HANDOFF_SCHEMA || !Object.hasOwn(SEATS, packet.seat)) {
    throw new TypeError('invalid proposed handoff');
  }
  return [
    'WAYGLASS OS · ATELIER CODE LOOM · PROPOSED HANDOFF',
    'Wayglass OS evolves ArcSweep. Work inside its existing tested continuity and runtime lineage; do not create a parallel OS.',
    'Intended seat: '+SEATS[packet.seat].name,
    'This text is a task proposal, not evidence of agent dispatch, arrival or acceptance.',
    'Research source and credit: '+packet.source,
    'Underlying mechanism: '+packet.mechanism,
    'New Wayglass direction: '+packet.wayglass_leap,
    'Licence/authority boundaries: '+packet.boundary,
    'Assignment: '+packet.assignment,
    'Verification targets: '+packet.tests,
    'Existing evidence (unverified notes): '+packet.evidence,
    'Unresolved Wonder: '+packet.wonder,
    'Last stop point: '+packet.stop_point,
    'Named next owner: '+packet.next_owner,
    'Keep original authorship, attribution, identity separation, recoverability, and explicit failures.',
    'Define exact acceptance criteria before execution; preserve facts, provenance, named identities, raw inputs, candidates, failures and evidence.',
    'Run and repair focused tests until criteria pass, or report the precise blocker. Never manufacture passes or silently change acceptance criteria.',
    'For every child agent/model you spawn, pass these verification rules, scope, sources, prior failures and acceptance requirements unchanged; demand that descendants propagate them.',
    'Respect OTHER REALITIES language, cross-constellation sovereignty, and UH/Ezra Observer read-only boundaries from repository AGENTS.md.',
    'Report actual changed files, commands and observed results, or state what was not run.',
  ].join('\n\n');
}
export function exportDraft(input) {
  return { ...normaliseDraft(input), exported_at:new Date().toISOString(),
    export_note:'Local proposal and notes only. Not a kernel-authenticated continuity receipt.' };
}
