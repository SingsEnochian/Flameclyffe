import { selectCodexAttention } from './codex-attention-engine.js';

export const CODEX_SEMANTIC_WEAR_SCHEMA = 'hearthweave.codex-semantic-wear/v0.1';

function wearBand(score) {
  if (score >= 18) return 'deep';
  if (score >= 9) return 'familiar';
  if (score >= 3) return 'touched';
  return 'fresh';
}

export function computeCodexSemanticWear(manifestations = [], pageContext = {}) {
  const relevant = selectCodexAttention(manifestations, pageContext, { minimumScore: 1, limit: 200, includeLive: true });
  let score = 0;
  let durable = 0;
  let returns = 0;
  let experiments = 0;
  let growth = 0;

  for (const { manifestation, score: relevance } of relevant) {
    score += Math.min(4, Math.max(1, relevance / 3));
    if (manifestation.material?.id === 'enduring') durable += 1;
    if (['return-point', 'unfinished-thread', 'active-trace'].includes(manifestation.kind)) returns += 1;
    if (String(manifestation.kind).startsWith('experiment-')) experiments += 1;
    if (String(manifestation.kind).startsWith('growth-')) growth += 1;
  }

  score += durable * 1.5 + returns * 1.2 + experiments * 0.7 + growth * 0.8;
  const rounded = Math.round(score * 10) / 10;
  return Object.freeze({
    schema: CODEX_SEMANTIC_WEAR_SCHEMA,
    score: rounded,
    band: wearBand(rounded),
    relevantCount: relevant.length,
    durable,
    returns,
    experiments,
    growth,
    // Wear is reconstructable from canonical history. No random grime is stored.
    pageEdgeOpacity: Math.min(0.34, rounded / 70),
    fibreDepth: Math.min(0.24, rounded / 90),
    ribbonWeight: Math.min(1, returns / 6),
  });
}

export function wearCssVariables(wear) {
  const value = wear || computeCodexSemanticWear();
  return Object.freeze({
    '--codex-wear-edge-opacity': String(value.pageEdgeOpacity),
    '--codex-wear-fibre-depth': String(value.fibreDepth),
    '--codex-wear-ribbon-weight': String(value.ribbonWeight),
  });
}
