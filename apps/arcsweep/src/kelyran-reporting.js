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
