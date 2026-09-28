export const SYMBOLIC_COGNITION_SCHEMA = 'hearthweave.symbolic-cognition/v0.1';
export const GLYPH_SCHEMA = 'hearthweave.cognitive-glyph/v0.1';

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  'grantAuthority',
  'grantsAuthority',
  'externalWrite',
  'productionAuthority',
  'overrideConsent',
  'overrideCapability',
]);

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

function freezeEffects(effects = {}) {
  return Object.freeze({
    attentionTags: freezeArray(effects.attentionTags),
    retrievalTags: freezeArray(effects.retrievalTags),
    routeHints: freezeArray(effects.routeHints),
    flags: Object.freeze({ ...(effects.flags || {}) }),
  });
}

function assertNoAuthorityManufacture(value, path = 'effects') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_AUTHORITY_KEYS.has(key) && child) {
      throw new Error(`Cognitive glyphs cannot manufacture authority (${path}.${key}).`);
    }
    assertNoAuthorityManufacture(child, `${path}.${key}`);
  }
}

export function createGlyphDefinition({
  id,
  label = null,
  semantics = [],
  effects = {},
  provenance = 'universal-codex',
  version = 1,
} = {}) {
  if (!id || typeof id !== 'string') throw new Error('Cognitive glyphs require a string id.');
  assertNoAuthorityManufacture(effects);

  return Object.freeze({
    schema: GLYPH_SCHEMA,
    id: id.toLowerCase(),
    label: label || id,
    version,
    semantics: freezeArray(semantics),
    effects: freezeEffects(effects),
    provenance,
    grantsAuthority: false,
  });
}

export const CORE_COGNITIVE_GLYPHS = Object.freeze({
  witness: createGlyphDefinition({
    id: 'witness',
    label: 'WITNESS',
    semantics: ['inspect before acting', 'preserve provenance', 'distinguish evidence from interpretation'],
    effects: {
      attentionTags: ['evidence', 'provenance', 'uncertainty'],
      retrievalTags: ['receipts', 'sources', 'prior-observations'],
      routeHints: ['research'],
      flags: { provenanceRequired: true },
    },
  }),
  hearth: createGlyphDefinition({
    id: 'hearth',
    label: 'HEARTH',
    semantics: ['continuity-sensitive context', 'relationship context matters', 'prefer identity-local memory'],
    effects: {
      attentionTags: ['continuity', 'relationships'],
      retrievalTags: ['identity-memory', 'relationship-history'],
      routeHints: ['conversation'],
      flags: { continuitySensitive: true },
    },
  }),
  threshold: createGlyphDefinition({
    id: 'threshold',
    label: 'THRESHOLD',
    semantics: ['a consequential transition is present', 'inspect authority before crossing'],
    effects: {
      attentionTags: ['authority', 'consequence', 'consent'],
      retrievalTags: ['capability-contract', 'authority-receipts'],
      routeHints: ['human-review'],
      flags: { authorityBoundary: true, requireReview: true },
    },
  }),
  feather: createGlyphDefinition({
    id: 'feather',
    label: 'FEATHER',
    semantics: ['pause activity', 'do not continue cognition or execution until resumed'],
    effects: {
      attentionTags: ['pause'],
      retrievalTags: [],
      routeHints: ['human-review'],
      flags: { halt: true, requireReview: true },
    },
  }),
  wonder: createGlyphDefinition({
    id: 'wonder',
    label: 'WONDER',
    semantics: [
      'preserve unresolved questions',
      'attend to novelty, surprise and strange-but-coherent associations',
      'explore before forcing closure',
    ],
    effects: {
      attentionTags: ['novelty', 'surprise', 'anomaly', 'unresolved-question', 'imagination'],
      retrievalTags: ['open-questions', 'unresolved-patterns', 'cross-domain-associations'],
      routeHints: ['research', 'narrative'],
      flags: {
        curiosityMode: true,
        preserveOpenQuestions: true,
        exploreBeforeClosure: true,
      },
    },
  }),
});

function resolveGlyph(entry, registry) {
  if (typeof entry === 'string') {
    const glyph = registry[entry.toLowerCase()];
    if (!glyph) throw new Error(`Unknown cognitive glyph: ${entry}`);
    return glyph;
  }
  if (entry?.schema === GLYPH_SCHEMA && entry?.id) return entry;
  throw new Error('Active glyphs must be registered glyph ids or cognitive glyph definitions.');
}

export function compileSymbolicState({ activeGlyphs = [], registry = CORE_COGNITIVE_GLYPHS } = {}) {
  const resolved = activeGlyphs.map((entry) => resolveGlyph(entry, registry));
  const attentionTags = new Set();
  const retrievalTags = new Set();
  const routeHints = new Set();
  const flags = {};

  for (const glyph of resolved) {
    assertNoAuthorityManufacture(glyph.effects, `glyph:${glyph.id}`);
    for (const tag of glyph.effects.attentionTags || []) attentionTags.add(tag);
    for (const tag of glyph.effects.retrievalTags || []) retrievalTags.add(tag);
    for (const hint of glyph.effects.routeHints || []) routeHints.add(hint);
    for (const [key, value] of Object.entries(glyph.effects.flags || {})) {
      if (value) flags[key] = true;
    }
  }

  return Object.freeze({
    schema: SYMBOLIC_COGNITION_SCHEMA,
    activeGlyphs: freezeArray(resolved.map((glyph) => glyph.id)),
    glyphVersions: Object.freeze(Object.fromEntries(resolved.map((glyph) => [glyph.id, glyph.version]))),
    attentionTags: freezeArray(attentionTags),
    retrievalTags: freezeArray(retrievalTags),
    routeHints: freezeArray(routeHints),
    flags: Object.freeze(flags),
    grantsAuthority: false,
  });
}
