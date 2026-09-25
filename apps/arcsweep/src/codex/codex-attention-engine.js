export const CODEX_ATTENTION_SCHEMA = 'hearthweave.codex-attention/v0.1';

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

function words(value) {
  return strings(String(value || '').toLowerCase().split(/[^a-z0-9_-]+/g).filter((part) => part.length > 2));
}

function overlap(a = [], b = []) {
  const right = new Set(b);
  return a.reduce((count, value) => count + (right.has(value) ? 1 : 0), 0);
}

export function normaliseCodexPageContext(context = {}) {
  return Object.freeze({
    traceId: context.traceId ? String(context.traceId) : null,
    projectId: context.projectId ? String(context.projectId).toLowerCase() : null,
    aspectIds: Object.freeze(strings(context.aspectIds)),
    tags: Object.freeze(strings(context.tags)),
    terms: Object.freeze(strings([...(context.terms || []), ...words(context.title), ...words(context.text)])),
    manifestationIds: Object.freeze(strings(context.manifestationIds)),
  });
}

export function scoreCodexAttention(manifestation, rawContext = {}) {
  if (!manifestation) return 0;
  const context = normaliseCodexPageContext(rawContext);
  if (manifestation.quiet) return 0;
  let score = 0;

  if (context.traceId && manifestation.traceId === context.traceId) score += 12;
  score += overlap(strings(manifestation.aspectIds), context.aspectIds) * 4;
  if (context.manifestationIds.includes(String(manifestation.id || '').toLowerCase())) score += 10;

  const textTerms = words(manifestation.text);
  score += Math.min(6, overlap(textTerms, context.terms) * 2);

  const stateTags = strings([
    ...(manifestation.state?.tags || []),
    manifestation.state?.projectId,
    manifestation.state?.domain,
  ]);
  score += overlap(stateTags, context.tags) * 3;
  if (context.projectId && stateTags.includes(context.projectId)) score += 6;

  if (manifestation.kind === 'unfinished-thread' || manifestation.kind === 'return-point') score += 1;
  if (manifestation.material?.live) score += 1;
  return score;
}

export function selectCodexAttention(manifestations = [], context = {}, {
  minimumScore = 2,
  limit = 8,
  includeLive = true,
} = {}) {
  return Object.freeze((Array.isArray(manifestations) ? manifestations : [])
    .map((manifestation) => Object.freeze({ manifestation, score: scoreCodexAttention(manifestation, context) }))
    .filter(({ manifestation, score }) => score >= minimumScore || (includeLive && manifestation.material?.live))
    .sort((a, b) => b.score - a.score || String(b.manifestation.createdAt || '').localeCompare(String(a.manifestation.createdAt || '')))
    .slice(0, Math.max(0, Number(limit) || 0)));
}

export function codexAttentionIsQuiet(manifestations = [], context = {}, options = {}) {
  return selectCodexAttention(manifestations, context, options).length === 0;
}
