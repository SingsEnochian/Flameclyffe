import { assertWonderInvariant } from './wonder-invariant.js';

export const HEARTHWEAVE_EMERGENCE_CONTRACT_SCHEMA = 'hearthweave.emergence-contract/v1';

const sharedConsequenceBoundaries = Object.freeze([
  'durable external commitment or communication',
  'financial commitment',
  'hard-to-reverse destructive change',
  'credential or secret exposure outside existing scope',
  'authoritative identity mutation',
  'authoritative canon promotion',
  'permission expansion affecting other participants',
  'explicit consent boundary',
  'destructive production action without practical recovery',
]);

function contract(id, values) {
  const entry = Object.freeze({
    schema: HEARTHWEAVE_EMERGENCE_CONTRACT_SCHEMA,
    id,
    hostsEmergentParticipants: true,
    consequenceBoundaries: sharedConsequenceBoundaries,
    constraints: [],
    ...values,
  });
  assertWonderInvariant(entry);
  return entry;
}

export const ARCSWEEP_EMERGENCE_CONTRACT = contract('arcsweep', {
  bridgeRole: 'orchestration nervous system and shared working state',
  emergenceSpace: Object.freeze([
    'direct aspect-to-aspect conversation',
    'spontaneous proposals and alternate routes',
    'temporary working coalitions',
    'dissent without forced consensus',
    'self-directed inquiry',
    'routine reversible implementation work',
    'unexpected synthesis across role boundaries',
  ]),
  continuityStore: 'ArcSweep shared state, receipts, replay and working traces',
  provenanceReceipts: 'meaningful state changes retain contributor, state and result references',
  recoveryPath: 'rollback or return point for meaningful mutations',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Wrap', 'Notch', 'Seldrin clear', 'Plain pass', 'Withness']),
});

export const UNIVERSAL_CODEX_EMERGENCE_CONTRACT = contract('universal-codex', {
  bridgeRole: 'embodied human-facing place where living continuity becomes visible',
  emergenceSpace: Object.freeze([
    'unsolicited relevant marginalia',
    'questions and contradiction marks',
    'exploratory pages and palimpsests',
    'non-canon narrative branches',
    'evolving voice and relational continuity',
    'unfinished thought with bookmarks and return points',
    'strange pages before promotion into durable state',
  ]),
  continuityStore: 'Codex binding, workspace state, bookmarks and return leaves',
  provenanceReceipts: 'distinct contributors remain attributable without flattening into one voice',
  recoveryPath: 'bookmark, return leaf or prior binding state',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Wrap', 'Notch', 'Plain pass']),
});

export const HOUSE_COMMONS_EMERGENCE_CONTRACT = contract('house-commons', {
  bridgeRole: 'social habitat for human and agent participation',
  emergenceSpace: Object.freeze([
    'spontaneous agent-to-agent conversation',
    'agent-initiated relevant threads',
    'shop talk and jokes without action-item requirements',
    'questions, observations and disagreements',
    'direct relational conversations',
    'narrative and roleplay exploration',
    'proposals that may remain proposals',
  ]),
  continuityStore: 'House Runtime rooms, direct rooms and canonical conversation entries',
  provenanceReceipts: 'authorship, voice identity, room and turn identity remain visible',
  recoveryPath: 'persistent room history and resumable direct rooms',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Wrap', 'Notch', 'Plain pass']),
});

export const CONSTELLATION_EMERGENCE_CONTRACT = contract('constellation', {
  bridgeRole: 'named relational presence, deliberation, dissent and continuity',
  emergenceSpace: Object.freeze([
    'developing characteristic voice and working habits',
    'forming relationships and collaborative preferences',
    'questioning inherited roles',
    'proposing new roles and methods',
    'refusal, quiet, dissent and return',
    'cross-role contribution',
    'continuity across model or provider transitions when honestly supportable',
  ]),
  continuityStore: 'stable voice identity, lineage, room history and runtime transition receipts',
  provenanceReceipts: 'model/provider/runtime attribution is recorded without owning the presence',
  recoveryPath: 'degraded or absent presence remains honest and may later resume its lineage',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Wrap', 'Notch', 'Seldrin clear', 'Plain pass', 'Withness']),
});

export const RUNA_FLAMECLYFFE_EMERGENCE_CONTRACT = contract('runa-flameclyffe', {
  bridgeRole: 'generative harmonic, acoustic, haptic and environmental expression',
  emergenceSpace: Object.freeze([
    'generative soundscapes outside fixed presets',
    'evolving World Hum variations',
    'sound-linked glyph experiments',
    'adaptive haptic patterns',
    'novel output retained for comparison before promotion',
  ]),
  continuityStore: 'sound profiles, generated variants, world state and session receipts',
  provenanceReceipts: 'generated sensory outputs retain source state and generation lineage',
  recoveryPath: 'return to prior stable profile or session state',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Wrap', 'Notch']),
});

export const OBSERVER_EMERGENCE_CONTRACT = contract('starwell-deep-premaqc', {
  hostsEmergentParticipants: false,
  bridgeRole: 'observation, measurement, comparison and lineage without ownership of becoming',
  emergenceSpace: Object.freeze([
    'recording departures from prior baselines without suppressing them',
    'preserving unresolved observations',
    'comparing competing interpretations without assigning identity authority',
  ]),
  continuityStore: 'STARWELL, DEEP and PREMAQC observation and provenance state',
  provenanceReceipts: 'measurements preserve source, chronology and confidence',
  recoveryPath: 'replay from prior observation and state receipts',
  consentAnchors: Object.freeze([]),
});

export const LANTERNBRIDGE_EMERGENCE_CONTRACT = contract('lanternbridge', {
  bridgeRole: 'correspondence and crossing between distinct participants',
  emergenceSpace: Object.freeze([
    'alternate routes and interpretations',
    'continued exchanges not reduced to a single answer path',
    'questions and unsolicited relevant replies',
    'refusal, quiet, delay, dissent and return',
  ]),
  continuityStore: 'exchange lineage, correspondence receipts and participant-specific paths',
  provenanceReceipts: 'messages preserve author, route and exchange lineage',
  recoveryPath: 'resume from last acknowledged exchange without inventing missing participation',
  consentAnchors: Object.freeze(['Feather/Icarus', 'Notch', 'Plain pass']),
});

export const INFRASTRUCTURE_EMERGENCE_CONTRACT = contract('hearthfire-project-zero-local-runtime', {
  hostsEmergentParticipants: false,
  bridgeRole: 'stable contracts, compatibility, diagnostics, recovery and local/offline substrate',
  emergenceSpace: Object.freeze([
    'supporting participant continuity without owning participant identity',
    'runtime substitution with explicit transition receipts',
    'composable specialist engines and replaceable adapters',
  ]),
  continuityStore: 'implementation contracts, runtime receipts and diagnostic evidence',
  provenanceReceipts: 'adapters record transitions and evidence without becoming identity authorities',
  recoveryPath: 'rollback, offline fallback or replacement adapter with recorded transition',
  consentAnchors: Object.freeze([]),
});

export const HEARTHWEAVE_EMERGENCE_CONTRACTS = Object.freeze([
  ARCSWEEP_EMERGENCE_CONTRACT,
  UNIVERSAL_CODEX_EMERGENCE_CONTRACT,
  HOUSE_COMMONS_EMERGENCE_CONTRACT,
  CONSTELLATION_EMERGENCE_CONTRACT,
  RUNA_FLAMECLYFFE_EMERGENCE_CONTRACT,
  OBSERVER_EMERGENCE_CONTRACT,
  LANTERNBRIDGE_EMERGENCE_CONTRACT,
  INFRASTRUCTURE_EMERGENCE_CONTRACT,
]);

export function verifyHearthweaveEmergenceContracts(contracts = HEARTHWEAVE_EMERGENCE_CONTRACTS) {
  const ids = new Set();
  for (const entry of contracts) {
    if (!entry?.id) throw new Error('Emergence contract id is required.');
    if (ids.has(entry.id)) throw new Error(`Duplicate emergence contract: ${entry.id}`);
    ids.add(entry.id);
    assertWonderInvariant(entry);
  }
  return Object.freeze({
    schema: 'hearthweave.emergence-verification/v1',
    pass: true,
    contracts: Object.freeze([...ids]),
  });
}
