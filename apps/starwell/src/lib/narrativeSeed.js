/**
 * narrativeSeed.js
 *
 * Narrative → canonical PREMAQ translation layer.
 *
 * PREMAQ reading order:
 *   Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence
 * Stable wire order:
 *   P C R E M A Q
 */

import { PREMAQ_WIRE_ORDER } from '../hearthweave-kernel/braided-spine.js';

/**
 * @typedef {{
 *   phrase: string,
 *   tokens: string[],
 *   phase_fingerprint: number[],
 *   premaq?: object,
 *   deep_seed?: object,
 *   wave_metrics?: object,
 *   coherence?: number,
 *   label: string
 * }} NarrativeSeed
 */

/** @type {NarrativeSeed[]} */
let _seeds = [];
let _loaded = false;

const DEFAULT_PREMAQ_SEED = Object.freeze({
  P: 0.5,
  C: 0.5,
  R: 0.5,
  E: 0.5,
  M: 0.5,
  A: 0.5,
  Q: 0.5,
});

export async function loadNarrativeSeeds(url = '/data/narrative-seeds.json') {
  if (_loaded) return;
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`narrative-seeds fetch returned ${response.status}`);
    _seeds = await response.json();
    _loaded = true;
  } catch (error) {
    console.warn('[narrativeSeed] Could not load index:', error.message);
    _seeds = [];
  }
}

export function querySeed(phrase) {
  if (!_seeds.length) {
    return {
      premaqSeed: { ...DEFAULT_PREMAQ_SEED },
      deepSeed: { ...DEFAULT_PREMAQ_SEED },
      resonanceScore: 0,
      matchedPhrase: '',
      waveCoherence: 0.5,
      label: '',
    };
  }

  const normalised = phrase.toLowerCase().trim();
  const exact = _seeds.find((seed) => seed.phrase === normalised);
  if (exact) return _result(exact, 1.0);

  const queryTokens = new Set(normalised.split(/\s+/).filter(Boolean));
  let best = _seeds[0];
  let bestScore = -Infinity;

  for (const seed of _seeds) {
    const jaccard = _jaccard(queryTokens, new Set(seed.tokens));
    const cosine = jaccard > 0
      ? _cosine(_seedFingerprint(normalised), seed.phase_fingerprint)
      : 0;
    const score = (jaccard * 0.4) + (cosine * 0.6);
    if (score > bestScore) {
      bestScore = score;
      best = seed;
    }
  }

  return _result(best, Math.max(0, bestScore));
}

export function resonantSeeds(phrase, threshold = 0.7) {
  if (!_seeds.length) return [];
  const fingerprint = _seedFingerprint(phrase.toLowerCase().trim());
  return _seeds
    .map((seed) => ({ seed, score: _cosine(fingerprint, seed.phase_fingerprint) }))
    .filter(({ score }) => score >= threshold)
    .sort((left, right) => right.score - left.score);
}

export function isLoaded() {
  return _loaded;
}

export function allSeeds() {
  return _seeds.slice();
}

function canonicalPremaq(seed) {
  const source = seed.premaq ?? seed.deep_seed ?? {};
  const mapped = {
    ...DEFAULT_PREMAQ_SEED,
    ...source,
  };

  // Legacy seed files may carry `charge`; it migrates into Qualia only as an
  // explicit compatibility read and is never emitted under the old name.
  if (!Number.isFinite(source.Q) && Number.isFinite(source.charge)) mapped.Q = source.charge;

  return Object.fromEntries(PREMAQ_WIRE_ORDER.map((axis) => [
    axis,
    Number.isFinite(mapped[axis]) ? mapped[axis] : DEFAULT_PREMAQ_SEED[axis],
  ]));
}

function _result(seed, score) {
  const premaqSeed = canonicalPremaq(seed);
  const waveCoherence = seed.wave_metrics?.wave_coherence
    ?? seed.coherence
    ?? 0.5;

  return {
    premaqSeed,
    // `deepSeed` remains as a compatibility alias for existing consumers while
    // carrying the canonical seven-axis PREMAQ body.
    deepSeed: { ...premaqSeed },
    resonanceScore: Math.round(score * 1000) / 1000,
    matchedPhrase: seed.phrase,
    waveCoherence,
    coherence: waveCoherence,
    label: seed.label,
  };
}

function _seedFingerprint(phrase, nCoeffs = 32) {
  let hash = 5381;
  for (let index = 0; index < phrase.length; index += 1) {
    hash = ((hash << 5) + hash) + phrase.charCodeAt(index);
    hash &= 0xffffffff;
  }
  const angle = ((hash >>> 0) / 0xffffffff) * 2 * Math.PI;

  const fingerprint = new Array(nCoeffs);
  for (let index = 0; index < nCoeffs; index += 1) {
    fingerprint[index] = index < nCoeffs / 2
      ? Math.sin((index + 1) * angle)
      : Math.cos((index - nCoeffs / 2 + 1) * angle);
  }

  const norm = Math.sqrt(fingerprint.reduce((sum, value) => sum + (value * value), 0)) || 1;
  return fingerprint.map((value) => value / norm);
}

function _cosine(left, right) {
  const n = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < n; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return dot / ((Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) + 1e-8);
}

function _jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}
