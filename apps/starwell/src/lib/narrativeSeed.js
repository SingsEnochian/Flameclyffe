/**
 * narrativeSeed.js
 *
 * Narrative → DEEP seed translation layer.
 * Loads the pre-computed phase fingerprint index from data/narrative-seeds.json
 * (built by pytorch-labs/.../export_narrative_seeds.py) and provides phrase → DEEP
 * seed lookup for use in STARWELL and Terra Aeterna site navigation.
 *
 * Query logic:
 *   1. Exact match (case-insensitive, stripped)
 *   2. Token overlap score (Jaccard similarity on word sets)
 *   3. Cosine similarity on phase fingerprints (most reliable, slowest)
 *
 * The returned deepSeed is in normaliseDeepState() format: { P, C, R, E, M, A, charge }.
 * Pass it directly to buildStarburstVars() or computeWaveFeatures() from standingWaveLens.js.
 *
 * Usage:
 *   import { loadNarrativeSeeds, querySeed } from './lib/narrativeSeed.js';
 *   await loadNarrativeSeeds('/data/narrative-seeds.json');
 *   const { deepSeed, resonanceScore, matchedPhrase } = querySeed('the withinwood holds memory');
 */

/** @typedef {{ phrase: string, tokens: string[], phase_fingerprint: number[], deep_seed: object, coherence: number, label: string }} NarrativeSeed */

/** @type {NarrativeSeed[]} */
let _seeds = [];
let _loaded = false;

const DEFAULT_DEEP_SEED = { P: 0.5, C: 0.5, R: 0.5, E: 0.5, M: 0.3, A: 0.6, charge: 0.5 };

/**
 * Load the narrative seed index. Safe to call multiple times — loads once.
 * @param {string} url — path to narrative-seeds.json
 * @returns {Promise<void>}
 */
export async function loadNarrativeSeeds(url = '/data/narrative-seeds.json') {
  if (_loaded) return;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`narrative-seeds fetch returned ${res.status}`);
    _seeds = await res.json();
    _loaded = true;
  } catch (err) {
    console.warn('[narrativeSeed] Could not load index:', err.message);
    _seeds = [];
  }
}

/**
 * Query the narrative seed index for the closest match.
 * Falls back gracefully if the index is not loaded.
 *
 * @param {string} phrase
 * @returns {{ deepSeed: object, resonanceScore: number, matchedPhrase: string, coherence: number, label: string }}
 */
export function querySeed(phrase) {
  if (!_seeds.length) {
    return { deepSeed: { ...DEFAULT_DEEP_SEED }, resonanceScore: 0, matchedPhrase: '', coherence: 0.5, label: '' };
  }

  const normalised = phrase.toLowerCase().trim();

  // 1. Exact match
  const exact = _seeds.find(s => s.phrase === normalised);
  if (exact) return _result(exact, 1.0);

  // 2. Score all candidates — combine Jaccard and fingerprint cosine
  const queryTokens = new Set(normalised.split(/\s+/).filter(Boolean));
  let best = _seeds[0];
  let bestScore = -Infinity;

  for (const seed of _seeds) {
    const jaccard = _jaccard(queryTokens, new Set(seed.tokens));
    // Only compute cosine for candidates with any token overlap
    const cosine = jaccard > 0 ? _cosine(_seedFingerprint(normalised), seed.phase_fingerprint) : 0;
    const score = jaccard * 0.4 + cosine * 0.6;
    if (score > bestScore) { bestScore = score; best = seed; }
  }

  return _result(best, Math.max(0, bestScore));
}

/**
 * Return all seeds whose phase fingerprint cosine similarity exceeds threshold.
 * Useful for "what else resonates with this phrase" queries.
 *
 * @param {string} phrase
 * @param {number} threshold — default 0.7
 * @returns {Array<{ seed: NarrativeSeed, score: number }>}
 */
export function resonantSeeds(phrase, threshold = 0.7) {
  if (!_seeds.length) return [];
  const fp = _seedFingerprint(phrase.toLowerCase().trim());
  return _seeds
    .map(seed => ({ seed, score: _cosine(fp, seed.phase_fingerprint) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/** True once loadNarrativeSeeds() has completed successfully. */
export function isLoaded() { return _loaded; }

/** All loaded seeds. */
export function allSeeds() { return _seeds.slice(); }

// ── Internal helpers ──────────────────────────────────────────────────────────

function _result(seed, score) {
  return {
    deepSeed:       { ...DEFAULT_DEEP_SEED, ...seed.deep_seed },
    resonanceScore: Math.round(score * 1000) / 1000,
    matchedPhrase:  seed.phrase,
    coherence:      seed.coherence,
    label:          seed.label,
  };
}

/**
 * Lightweight sinusoidal fingerprint of a query phrase — same projection used
 * by export_narrative_seeds.py for corpus phrases. Approximate for new phrases;
 * exact for corpus phrases (where the full model embedding was used).
 */
function _seedFingerprint(phrase, nCoeffs = 32) {
  // Hash phrase to a stable "phase" in [0, 2π) via djb2
  let hash = 5381;
  for (let i = 0; i < phrase.length; i++) {
    hash = ((hash << 5) + hash) + phrase.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  const angle = ((hash >>> 0) / 0xffffffff) * 2 * Math.PI;

  const fp = new Array(nCoeffs);
  for (let i = 0; i < nCoeffs; i++) {
    fp[i] = i < nCoeffs / 2
      ? Math.sin((i + 1) * angle)
      : Math.cos((i - nCoeffs / 2 + 1) * angle);
  }
  // L2 normalise
  const norm = Math.sqrt(fp.reduce((s, v) => s + v * v, 0)) || 1;
  return fp.map(v => v / norm);
}

function _cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function _jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const t of setA) { if (setB.has(t)) intersection++; }
  return intersection / (setA.size + setB.size - intersection);
}
