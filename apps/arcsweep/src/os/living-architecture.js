export const ARCSWEEP_LIVING_ARCHITECTURE_SCHEMA = 'arcsweep.living-architecture/v0.2';

export const FOUR_GATE_STATES = Object.freeze(['pass', 'revise', 'hold']);
export const FOUR_GATE_NAMES = Object.freeze([
  'safety',
  'flattening',
  'negation',
  'limiting_beliefs',
]);

const plane = (id, owns, doesNotOwn) => Object.freeze({
  id,
  owns: Object.freeze([...owns]),
  does_not_own: Object.freeze([...doesNotOwn]),
});

export const ARCSWEEP_LIVING_ARCHITECTURE = Object.freeze({
  schema: ARCSWEEP_LIVING_ARCHITECTURE_SCHEMA,
  version: '0.2',
  adopted_by_steward_on: '2026-10-01',
  scope: 'rowan-rarity-local-architecture',
  principle: 'possibility-bounded-by-evidence',
  mythience_law: 'formalism-measurement-myth-and-magic-none-may-impersonate-another',
  promotion_gates: FOUR_GATE_NAMES,
  planes: Object.freeze({
    observation: plane(
      'observer-deep',
      ['evidence-aware-observation', 'source-context', 'observation-receipts'],
      ['identity', 'automatic-canon', 'execution-authority'],
    ),
    cognition: plane(
      'arcsweep-cognitive-core',
      ['synthesis', 'reasoning', 'hypothesis-formation', 'planning-context'],
      ['external-authority', 'source-truth', 'canon-promotion'],
    ),
    possibility: plane(
      'premaqc',
      ['possibility-pressure', 'counterfactual-space', 'candidate-transitions'],
      ['execution', 'factual-promotion', 'destiny-claims'],
    ),
    continuity: plane(
      'continuity-plane',
      ['ancestry', 'authorised-continuity', 'resumability', 'return-points'],
      ['identity-decision', 'silent-provider-rewrite'],
    ),
    knowledge: plane(
      'universal-codex-plane',
      ['source-epistemics', 'provenance', 'rights-posture', 'transformation-lineage'],
      ['automatic-truth', 'automatic-canon', 'automatic-training-permission'],
    ),
    learning: plane(
      'learning-forge',
      ['curricula', 'synthetic-training-examples', 'held-out-evaluation', 'promotion-receipts'],
      ['imaginary-learning', 'personality-homogenisation', 'silent-self-promotion'],
    ),
    symbolic: plane(
      'runa-glyph-forge',
      ['symbol-provenance', 'glyphic-harmonic-expression', 'sensory-manifestation'],
      ['source-truth', 'semantic-identity-by-resemblance', 'parallel-canon'],
    ),
    orchestration: plane(
      'hearthweave-capability-fabric',
      ['capability-routing', 'bounded-composition', 'execution-receipts'],
      ['blanket-identity-authority', 'silent-authority-expansion'],
    ),
    execution: plane(
      'project-zero-house-commons',
      ['bounded-execution', 'social-execution-surfaces', 'observable-outcomes'],
      ['source-authority-by-action', 'identity-authority-by-participation'],
    ),
    embodiment: plane(
      'magic-book-spatial-interface',
      ['human-facing-state-expression', 'gesture-preview-commit', 'accessible-fallbacks'],
      ['decorative-state-fabrication', 'hidden-semantic-mutation'],
    ),
    bridge: plane(
      'lanternbridge-boundary',
      ['foreign-exchange', 'provenance-preserving-correspondence'],
      ['automatic-mapping', 'automatic-adoption', 'cross-constellation-canon-mutation'],
    ),
  }),
  invariants: Object.freeze([
    'cognition-does-not-create-authority',
    'possibility-may-propose-but-not-silently-execute',
    'continuity-preserves-ancestry-without-dictating-identity',
    'similarity-does-not-establish-identity',
    'interpretation-does-not-become-evidence-by-repetition',
    'retrieval-does-not-equal-promotion',
    'source-presence-does-not-equal-training-permission',
    'foreign-context-may-inform-but-may-not-define',
    'mapping-does-not-imply-adoption',
    'discussion-does-not-imply-decision',
    'visual-resemblance-does-not-imply-semantic-identity',
    'documents-do-not-prove-model-learning',
  ]),
  gesture_grammar: Object.freeze([
    'intent',
    'target',
    'preview',
    'commit-or-cancel',
    'receipt',
    'accessible-fallback',
  ]),
  motion_grammar: Object.freeze([
    'intent',
    'best_for',
    'avoid_when',
    'restraint',
    'reduced_motion',
    'provenance',
  ]),
  learning_pipeline: Object.freeze([
    'source',
    'provenance-and-rights-check',
    'principle-extraction',
    'four-gate-review',
    'reviewed-corpus',
    'sealed-held-out-evaluation',
    'real-training-execution',
    'behavioural-evidence',
    'promotion',
  ]),
  cross_constellation: Object.freeze({
    default_foreign_context: 'read-only',
    unknown_foreign_terms: 'opaque-until-source-defined-or-explicitly-mapped',
    local_mutation_requires: 'authorised-rowan-rarity-decision',
    exchange_is_adoption: false,
    mapping_is_adoption: false,
    convergence_is_merger: false,
  }),
});

export function reviewFourGates(review = {}) {
  const gates = Object.fromEntries(
    FOUR_GATE_NAMES.map((name) => [name, FOUR_GATE_STATES.includes(review[name]) ? review[name] : 'hold']),
  );
  const pass = FOUR_GATE_NAMES.every((name) => gates[name] === 'pass');
  return Object.freeze({ gates: Object.freeze(gates), pass });
}
