import { buildTutorContext, normaliseKelyranSchool } from './kelyran-school.js';

export const KELYRAN_MODEL_REPORT_SCHEMA = 'arcsweep.kelyran-model-report/v0.1';
export const KELYRAN_MODEL_REPORTING_SCHEMA = 'arcsweep.kelyran-model-reporting-layer/v0.1';
export const KELYRAN_REPORT_STATES = Object.freeze(['report', 'nothing-to-report', 'declined']);

const clean = (value) => typeof value === 'string' ? value.trim() : '';

export function setKelyranDiscussionInvitation(school, open, now = new Date().toISOString()) {
  const next = normaliseKelyranSchool(school, now);
  next.reporting.invitationOpen = open === true;
  next.reporting.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function createKelyranModelReport({
  modelId,
  state = 'report',
  topics = [],
  unknownForms = [],
  curiosities = [],
  difficulties = [],
  wantsDiscussion = false,
  shareWithSteward = false,
} = {}, now = new Date().toISOString()) {
  const identity = clean(modelId);
  if (!identity) throw new Error('A model identity is required.');
  if (!KELYRAN_REPORT_STATES.includes(state)) throw new Error('Unknown model-report state.');
  const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
  const report = {
    schema: KELYRAN_MODEL_REPORT_SCHEMA,
    id: `kelyran-report-${identity.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.parse(now) || Date.now()}`,
    modelId: identity,
    state,
    topics: state === 'report' ? list(topics) : [],
    unknownForms: state === 'report' ? list(unknownForms) : [],
    curiosities: state === 'report' ? list(curiosities) : [],
    difficulties: state === 'report' ? list(difficulties) : [],
    wantsDiscussion: state === 'report' && wantsDiscussion === true,
    shareWithSteward: state === 'report' && shareWithSteward === true,
    createdAt: now,
  };
  return Object.freeze(report);
}

export function appendKelyranModelReport(school, report, now = new Date().toISOString()) {
  if (report?.schema !== KELYRAN_MODEL_REPORT_SCHEMA) throw new Error('Unsupported Kelyran model report.');
  const next = normaliseKelyranSchool(school, now);
  if (next.reporting.reports.some((item) => item.id === report.id)) return next;
  next.reporting.reports.unshift(structuredClone(report));
  next.reporting.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function buildKelyranModelReportingLayer(school, modelId) {
  const normalised = normaliseKelyranSchool(school);
  const identity = clean(modelId);
  if (!identity) throw new Error('A model identity is required.');
  return Object.freeze({
    schema: KELYRAN_MODEL_REPORTING_SCHEMA,
    modelId: identity,
    invitationOpen: normalised.reporting.invitationOpen,
    consent: {
      optional: true,
      validStates: [...KELYRAN_REPORT_STATES],
      defaultAudience: 'models-only',
      stewardAccessRequiresExplicitShare: true,
    },
    tutor: buildTutorContext(normalised),
    ownReports: normalised.reporting.reports.filter((item) => item.modelId === identity),
    peerReports: normalised.reporting.reports.filter((item) => item.modelId !== identity && item.shareWithSteward !== true),
  });
}

export function stewardVisibleKelyranReports(school) {
  return normaliseKelyranSchool(school).reporting.reports.filter((item) => item.shareWithSteward === true);
}

export function buildKelyranReportPrompt(layer) {
  if (layer?.schema !== KELYRAN_MODEL_REPORTING_SCHEMA) throw new Error('A Kelyran model reporting layer is required.');
  const canon = layer.tutor;
  return [
    'KELYRAN MODEL SELF-REPORT · OPTIONAL',
    `You are responding only as ${layer.modelId}. Never speak for another model.`,
    'You may report, say nothing-to-report, or decline. Declining needs no explanation and carries no penalty.',
    `Discussion invitation: ${layer.invitationOpen ? 'open, if you want it' : 'closed'}.`,
    `Canon revision: ${canon.canonRevision}`,
    `Authority: ${canon.rule}`,
    `Teachable lexicon: ${JSON.stringify(canon.lexicon)}`,
    `Teachable grammar: ${JSON.stringify(canon.grammar)}`,
    `Teachable phonology: ${JSON.stringify(canon.phonology)}`,
    `Your previous reports: ${JSON.stringify(layer.ownReports)}`,
    'Return exactly one JSON object and no surrounding prose:',
    JSON.stringify({ state: 'report | nothing-to-report | declined', topics: [], unknown_forms: [], curiosities: [], difficulties: [], wants_discussion: false, share_with_steward: false }),
    'Never place an invented Kelyran form into canon. Put uncertain forms in unknown_forms.',
  ].join('\n\n');
}

function responseObject(raw) {
  const source = clean(raw);
  if (source.startsWith('[REFUSAL]')) return { state: 'declined' };
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || source;
  try { return JSON.parse(candidate); } catch { throw new Error('Model report must be exactly one valid JSON object.'); }
}

export function parseKelyranModelReport(raw, expectedModelId, now = new Date().toISOString()) {
  const value = responseObject(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Model report must be a JSON object.');
  if (value.model_id && clean(value.model_id) !== clean(expectedModelId)) throw new Error('Model report identity does not match its bound route.');
  const allowed = new Set(['state', 'model_id', 'topics', 'unknown_forms', 'curiosities', 'difficulties', 'wants_discussion', 'share_with_steward']);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`Unknown model-report fields: ${unknown.join(', ')}.`);
  return createKelyranModelReport({
    modelId: expectedModelId,
    state: value.state,
    topics: value.topics,
    unknownForms: value.unknown_forms,
    curiosities: value.curiosities,
    difficulties: value.difficulties,
    wantsDiscussion: value.wants_discussion,
    shareWithSteward: value.share_with_steward,
  }, now);
}
