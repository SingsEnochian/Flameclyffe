import {
  ARCSWEEP_SUPABASE_EDGE_ORIGIN,
  isHostedCaretakerSurface,
  readCaretakerSupabaseAccessToken,
} from '../caretaker-transport.js';

export const ARCSWEEP_ONTOLOGY_SCHEMA = 'arcsweep.ontology-runtime/v1';
export const ARCSWEEP_ONTOLOGY_TRANSFORMATION_SCHEMA = 'arcsweep.ontology-transformation/v1';
export const ARCSWEEP_ONTOLOGY_REVIEW_SCHEMA = 'arcsweep.ontology-review/v1';
export const ARCSWEEP_ONTOLOGY_ENDPOINT = `${ARCSWEEP_SUPABASE_EDGE_ORIGIN}/arcsweep-cognitive`;

function text(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

async function accessToken(provider = readCaretakerSupabaseAccessToken) {
  try { return text(await provider(), 12000); } catch { return ''; }
}

async function postOntology(body, {
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
} = {}) {
  const token = await accessToken(accessTokenProvider);
  if (!token) throw new Error('Steward sign-in required for ontology review.');
  const response = await fetchImpl(ARCSWEEP_ONTOLOGY_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ontology runtime failed (${response.status}).`);
  return data;
}

function clampMetric(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) throw new Error('Ontology review metrics must be between 0 and 1.');
  return number;
}

export function normaliseOntologyMetrics(metrics = {}) {
  return Object.freeze({
    distinction_retained: clampMetric(metrics.distinction_retained),
    provenance_retained: clampMetric(metrics.provenance_retained),
    relation_fidelity: clampMetric(metrics.relation_fidelity),
    uncertainty_preserved: clampMetric(metrics.uncertainty_preserved),
    reversibility: clampMetric(metrics.reversibility),
  });
}

export function ontologyMetricsComplete(metrics = {}) {
  return Object.values(normaliseOntologyMetrics(metrics)).every((value) => value !== null);
}

export async function fetchOntologyReviewQueue({
  limit = 12,
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
  location = globalThis.location,
} = {}) {
  if (!isHostedCaretakerSurface(location)) {
    return Object.freeze({ schema: ARCSWEEP_ONTOLOGY_REVIEW_SCHEMA, records: [], persistence: 'hosted-only' });
  }
  const boundedLimit = Math.max(1, Math.min(24, Number(limit) || 12));
  const data = await postOntology({ mode: 'ontology-review-list', limit: boundedLimit }, { fetchImpl, accessTokenProvider });
  return Object.freeze({
    schema: data.schema || ARCSWEEP_ONTOLOGY_REVIEW_SCHEMA,
    records: Array.isArray(data.records) ? data.records : [],
    persistence: 'supabase',
  });
}

export async function submitOntologyReview({
  id,
  verdict,
  metrics = {},
  note = '',
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
  location = globalThis.location,
} = {}) {
  const recordId = text(id, 120);
  const action = text(verdict, 40);
  if (!recordId || !['approve', 'flag_loss', 'unresolved'].includes(action)) {
    throw new Error('A transformation receipt and valid ontology verdict are required.');
  }
  const normalised = normaliseOntologyMetrics(metrics);
  if (action === 'approve' && !Object.values(normalised).every((value) => value !== null)) {
    throw new Error('Approve requires all five preservation metrics.');
  }
  if (!isHostedCaretakerSurface(location)) throw new Error('Ontology review requires the hosted Steward surface.');
  return Object.freeze(await postOntology({
    mode: 'ontology-review-update',
    id: recordId,
    verdict: action,
    metrics: normalised,
    note: text(note, 2000),
  }, { fetchImpl, accessTokenProvider }));
}
