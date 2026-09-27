export const EPRA_CANON_MANIFEST_SCHEMA = 'hearthweave.epra-canon-manifest/v0.1';
export const EPRA_CANON_PACKET_SCHEMA = 'hearthweave.canon-ingest-packet/v0.1';
export const EPRA_UNIVERSE_ID = 'epra-a-new-hope';

export const EPRA_CANON_CLASSES = Object.freeze([
  'current',
  'ancestor',
  'legacy',
  'reference',
  'exclude',
]);

const CLASS_PRECEDENCE = Object.freeze({
  current: 400,
  ancestor: 200,
  legacy: 200,
  reference: 100,
  exclude: 0,
});

function source({
  key,
  title,
  canonClass,
  family,
  required = false,
  contentPolicy = 'canon-prose-only',
  note = '',
} = {}) {
  if (!key || !title) throw new Error('EPRA_CANON: source key and title are required');
  if (!EPRA_CANON_CLASSES.includes(canonClass)) throw new Error(`EPRA_CANON: invalid canon class for ${key}`);
  return Object.freeze({
    key,
    title,
    canonClass,
    family,
    required,
    precedence: CLASS_PRECEDENCE[canonClass],
    contentPolicy,
    note,
    locatorPolicy: 'resolve-privately-at-ingest-time',
  });
}

export const EPRA_CANON_SOURCES = Object.freeze([
  source({
    key: 'epra-current-world-bible',
    title: 'Epra: A New Hope · current world bible',
    canonClass: 'current',
    family: 'current-world-bible',
    required: true,
    contentPolicy: 'current-canon-only',
    note: 'Primary authority for present Epra canon. The private Drive locator is intentionally not committed to the public repository.',
  }),
  source({
    key: 'epra-current-ekhara',
    title: 'Epra: A New Hope · Ekhara current design/canon',
    canonClass: 'current',
    family: 'species-and-anatomy',
    contentPolicy: 'current-canon-only',
    note: 'Current Ekhara material outranks legacy Hope’s Crest dragon anatomy when the two differ.',
  }),

  source({ key: 'destiny-weaves-guidebook', title: 'Destiny Weaves Guide Book', canonClass: 'ancestor', family: 'destiny-weaves', note: 'Ancestral source used to understand what Epra adapts, changes, or rejects.' }),
  source({ key: 'destiny-weaves-history', title: 'Destiny Weaves History', canonClass: 'ancestor', family: 'destiny-weaves' }),
  source({ key: 'destiny-weaves-dragon-notes', title: 'Dragon Notes', canonClass: 'ancestor', family: 'destiny-weaves', contentPolicy: 'source-canon-with-ooc-filter' }),
  source({ key: 'destiny-weaves-one-shots', title: 'Destiny Weaves - One Shots', canonClass: 'ancestor', family: 'destiny-weaves', contentPolicy: 'narrative-evidence' }),
  source({ key: 'destiny-weaves-dragons-guide', title: 'Guidebook - Dragons of Pern', canonClass: 'ancestor', family: 'destiny-weaves', contentPolicy: 'source-canon-with-derivative-boundary' }),

  source({ key: 'hopes-crest-setting', title: "Epra: Hope's Crest - A Post Pern Roleplay", canonClass: 'legacy', family: 'hopes-crest', note: 'Legacy Epra branch. Preserve history and candidate facts, but do not overwrite current A New Hope canon.' }),
  source({ key: 'hopes-crest-psionics', title: "Epra: Hope's Crest - Psionics", canonClass: 'legacy', family: 'hopes-crest', contentPolicy: 'source-canon-with-ooc-filter' }),
  source({ key: 'hopes-crest-fauna-flora', title: "Hope's Crest - Fauna and Flora", canonClass: 'legacy', family: 'hopes-crest', contentPolicy: 'source-canon-with-ooc-and-external-attribution-filter' }),
  source({ key: 'hopes-crest-human-culture', title: "Hope's Crest Human Culture", canonClass: 'legacy', family: 'hopes-crest' }),
  source({ key: 'hopes-crest-language', title: "Hope's Crest - Language", canonClass: 'legacy', family: 'hopes-crest' }),
  source({ key: 'hopes-crest-guilds', title: "Hope's Crest - Guilds", canonClass: 'legacy', family: 'hopes-crest' }),
  source({ key: 'hopes-crest-timeline', title: "Hope's Crest - Timeline", canonClass: 'legacy', family: 'hopes-crest' }),
  source({ key: 'hopes-crest-charter', title: "Hope's Crest Epran Charter", canonClass: 'legacy', family: 'hopes-crest' }),
  source({ key: 'hopes-crest-vignettes', title: 'Epra In Universe Vignettes', canonClass: 'legacy', family: 'hopes-crest', contentPolicy: 'narrative-evidence' }),
  source({ key: 'hopes-crest-plots', title: 'Hopes Crest plots', canonClass: 'reference', family: 'hopes-crest', contentPolicy: 'planning-reference-not-canon-by-default' }),

  source({ key: 'hopes-crest-candidate-form', title: "Epra: Hope's Crest Candidate Preference Form", canonClass: 'exclude', family: 'administrative', contentPolicy: 'exclude' }),
  source({ key: 'hopes-crest-forum-structure', title: "Hope's Crest Forum Structure", canonClass: 'exclude', family: 'administrative', contentPolicy: 'exclude' }),
  source({ key: 'hopes-crest-html-groups', title: "Epra: Hope's Crest HTML Code - Groups", canonClass: 'exclude', family: 'administrative', contentPolicy: 'exclude' }),
  source({ key: 'hopes-crest-discord-rules', title: "Hope's Crest Discord Rules", canonClass: 'exclude', family: 'administrative', contentPolicy: 'exclude' }),
]);

const byKey = new Map(EPRA_CANON_SOURCES.map((item) => [item.key, item]));

export function epraCanonSource(sourceKey) {
  return byKey.get(String(sourceKey || '').trim()) || null;
}

export function epraCanonManifestSnapshot() {
  const counts = EPRA_CANON_CLASSES.reduce((result, canonClass) => {
    result[canonClass] = EPRA_CANON_SOURCES.filter((item) => item.canonClass === canonClass).length;
    return result;
  }, {});
  return Object.freeze({
    schema: EPRA_CANON_MANIFEST_SCHEMA,
    universeId: EPRA_UNIVERSE_ID,
    rule: 'Current canon outranks older material. Ancestor and legacy conflicts are preserved as divergences until current canon adjudicates them. Excluded administrative sources never become world facts.',
    privacy: 'Source locators and raw private canon stay outside the public repository and are resolved only at ingest time.',
    counts: Object.freeze(counts),
    sources: EPRA_CANON_SOURCES,
  });
}

export function createEpraCanonIngestPacket({
  sourceKey,
  content,
  sourceRevision,
  retrievedAt = new Date().toISOString(),
  provenance = {},
} = {}) {
  const contract = epraCanonSource(sourceKey);
  if (!contract) throw new Error(`EPRA_CANON: unknown source ${sourceKey}`);
  if (contract.canonClass === 'exclude') throw new Error(`EPRA_CANON: ${sourceKey} is excluded from canon ingest`);
  const text = String(content || '').trim();
  if (!text) throw new Error(`EPRA_CANON: ${sourceKey} content is required`);
  const revision = String(sourceRevision || '').trim();
  if (!revision) throw new Error(`EPRA_CANON: ${sourceKey} sourceRevision is required`);
  const time = new Date(retrievedAt);
  if (Number.isNaN(time.getTime())) throw new Error('EPRA_CANON: retrievedAt must be a valid date-time');

  return Object.freeze({
    schema: EPRA_CANON_PACKET_SCHEMA,
    universeId: EPRA_UNIVERSE_ID,
    sourceKey: contract.key,
    sourceTitle: contract.title,
    canonClass: contract.canonClass,
    precedence: contract.precedence,
    contentPolicy: contract.contentPolicy,
    sourceRevision: revision,
    retrievedAt: time.toISOString(),
    content: text,
    provenance: Object.freeze({ ...provenance, privateLocatorPersisted: false }),
    mergePolicy: contract.canonClass === 'current'
      ? 'may-supersede-lower-precedence-facts-with-explicit-divergence-receipt'
      : 'never-silently-overwrite-higher-or-equal-precedence-facts',
  });
}

export function orderEpraCanonPackets(packets = []) {
  return Object.freeze([...packets].sort((left, right) => {
    const precedence = Number(right?.precedence || 0) - Number(left?.precedence || 0);
    if (precedence) return precedence;
    return String(left?.sourceKey || '').localeCompare(String(right?.sourceKey || ''));
  }));
}

export function validateEpraCanonManifest(sources = EPRA_CANON_SOURCES) {
  const violations = [];
  const keys = new Set();
  for (const item of sources || []) {
    if (!item?.key || keys.has(item.key)) violations.push(`${item?.key || 'unknown'}:duplicate-or-missing-key`);
    if (item?.key) keys.add(item.key);
    if (!EPRA_CANON_CLASSES.includes(item?.canonClass)) violations.push(`${item?.key || 'unknown'}:invalid-class`);
    if (item?.locatorPolicy !== 'resolve-privately-at-ingest-time') violations.push(`${item?.key || 'unknown'}:unsafe-locator-policy`);
    if (/drive\.google\.com|docs\.google\.com|[?&]id=/i.test(JSON.stringify(item))) violations.push(`${item?.key || 'unknown'}:public-private-locator`);
  }
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}
