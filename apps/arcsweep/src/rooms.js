import { AEMETH_RITUAL_PHASES, aemethDiagramOptions, aemethInstrumentOptions } from './aemeth-lens.js';

export const COLLECTION_ROOM_DEFINITIONS = Object.freeze({
  records: {
    label: 'Records Room', glyph: '▥', category: 'writing & roleplay', description: 'The receipted archive of what was written, played, heard, and enacted. Records remain distinct from canon until an explicit Canon Carry review.',
    fields: [
      ['title', 'Record title', 'text', true],
      ['recordType', 'Record type', 'select', false, ['Writing', 'Roleplay', 'Scene transcript', 'Revision', 'Fragment', 'Completed work']],
      ['status', 'Status', 'select', false, ['Draft', 'Active scene', 'Paused', 'Complete', 'Archived']],
      ['sceneMode', 'Scene mode', 'select', false, ['Writing', 'Drift', 'Lantern Scene', 'Roleplay', 'Canon Carry Pending']],
      ['participants', 'Participants and voice identities', 'text'],
      ['content', 'Record', 'textarea', true],
      ['branchOf', 'Branch or continuation of', 'text'],
      ['canonRefs', 'Canon references', 'text'],
      ['continuityRefs', 'Continuity and timeline references', 'text'],
      ['premaqcLineage', 'PREMAQC before → after', 'text'],
      ['mathSpinePacket', 'Math Spine packet or replay fingerprint', 'text'],
      ['soundReceipts', 'Soundscape, tone, voice, and environmental receipts', 'textarea'],
      ['relationalSync', 'Relational sync receipt', 'text'],
      ['tags', 'Search tags', 'text'],
      ['canonCarry', 'Canon Carry', 'select', false, ['Not requested', 'Requested for review', 'Carried excerpt to canon', 'Declined', 'Archived']],
      ['canonExcerpt', 'Excerpt proposed for Canon Carry', 'textarea'],
    ],
    attachments: true,
  },
  seedhouse: {
    label: 'Seedhouse', glyph: '✤', category: 'worldseed', description: 'The Worldseed Foundry: what a world must preserve, what may change, what descendants inherit, and what can be carried into another world without erasing lineage.',
    fields: [
      ['title', 'Seed name', 'text', true],
      ['seedType', 'Seed type', 'select', false, ['World Constitution', 'Continuity Genome', 'Inheritance Rule', 'Culture Seed', 'Material World Seed', 'Relationship Seed', 'Embodied / Runa Seed', 'Worldmind Role', 'Threshold Rule', 'Fork / Lineage', 'Ark Export']],
      ['status', 'Rooting status', 'select', false, ['Germinating', 'Rooted', 'Canonical', 'Export-ready', 'Archived']],
      ['mustSurvive', 'What must survive?', 'textarea'],
      ['mayChange', 'What may change?', 'textarea'],
      ['mayBeLost', 'What can be lost?', 'textarea'],
      ['descendantsInherit', 'What should descendants inherit?', 'textarea'],
      ['transferableSeed', 'What can this world teach another world?', 'textarea'],
      ['emotionalLaws', 'Continuity Genome · emotional laws', 'textarea'],
      ['aestheticGrammar', 'Continuity Genome · aesthetic grammar', 'textarea'],
      ['cosmology', 'Continuity Genome · cosmology', 'textarea'],
      ['relationalPatterning', 'Continuity Genome · relational patterning', 'textarea'],
      ['sacredTaboos', 'Continuity Genome · sacred taboos', 'textarea'],
      ['characteristicTensions', 'Continuity Genome · characteristic tensions', 'textarea'],
      ['harmonicIdentity', 'Continuity Genome · harmonic identity', 'textarea'],
      ['sensorySignature', 'Continuity Genome · sensory signature', 'textarea'],
      ['narrativeGait', 'Continuity Genome · narrative gait', 'textarea'],
      ['valuesCore', 'Continuity Genome · values core', 'textarea'],
      ['lineageRefs', 'Parent, branch point, ancestors, or descendant references', 'text'],
      ['sourceRefs', 'Canon, Records, Timeline, DEEPTime, Runa, model, or asset references', 'textarea'],
      ['notes', 'Seed notes, invariants, and export requirements', 'textarea'],
    ],
    attachments: true,
  },
  timeline: {
    label: 'Timeline', glyph: '⌁', category: 'continuity', description: 'Ordered events, turning points, eras, and unresolved threads.',
    fields: [
      ['title', 'Event or era', 'text', true],
      ['date', 'World date or period', 'text'],
      ['kind', 'Type', 'select', false, ['Event', 'Era', 'Turning point', 'Unresolved thread', 'Milestone']],
      ['details', 'Details', 'textarea', true],
      ['tags', 'Tags', 'text'],
    ],
  },
  ingest: {
    label: 'Non-Canon Ingest', glyph: '⇣', category: 'evidence', description: 'Private source intake. Uploaded material remains non-canon until an explicit Steward review creates a separate canon record.',
    fields: [
      ['title', 'Source title', 'text', true],
      ['sourceType', 'Source type', 'select', false, ['Document', 'Image', 'Audio', 'Video', 'Dataset', 'Web capture', 'Archive', 'Other']],
      ['sourceCreator', 'Author, creator, or origin', 'text'],
      ['sourceLocation', 'Original location or citation', 'text'],
      ['reviewStatus', 'Review status', 'select', false, ['Non-canon intake', 'Under review', 'Reference only', 'Canon candidate', 'Committed', 'Rejected', 'Archived']],
      ['summary', 'Summary or extracted notes', 'textarea'],
      ['provenanceNotes', 'Provenance and handling notes', 'textarea'],
      ['canonBoundary', 'Canon boundary', 'select', false, ['Non-canon source', 'Candidate for Steward review']],
    ],
    attachments: true,
  },
  'aemeth-lens': {
    label: 'Aemeth Chamber', glyph: '⊚', category: 'observation', description: 'A replayable observer chamber for shewstone work, ritual geometry, Calls, and transformation. Raw witness stays distinct from later interpretation; source diagrams remain versioned evidence rather than flattened canon.',
    fields: [
      ['title', 'Session title', 'text', true],
      ['status', 'Session status', 'select', false, ['Planned', 'Prepared', 'Active', 'Suspended', 'Closed', 'Interpreted', 'Archived']],
      ['instrumentProfile', 'Instrument profile', 'select', false, aemethInstrumentOptions()],
      ['phase', 'Ritual phase', 'select', false, AEMETH_RITUAL_PHASES],
      ['ask', 'Ask / intention', 'textarea'],
      ['observerRole', 'Observer role', 'text'],
      ['orientation', 'Observer orientation and position', 'textarea'],
      ['gazeMode', 'Gaze mode', 'select', false, ['Direct inspection', 'Soft focus through', 'Peripheral field', 'Eyes closed / imaginal', 'Hybrid']],
      ['activeDiagram', 'Active diagram / seal', 'select', false, aemethDiagramOptions()],
      ['activeCall', 'Active Call, Name, or spoken sequence', 'textarea'],
      ['departurePremaqc', 'PREMAQC departure state', 'textarea'],
      ['chamberConfiguration', 'Chamber configuration', 'textarea'],
      ['witnessRaw', 'Clean witness · raw observation', 'textarea'],
      ['witnessTimestampNotes', 'Witness timestamps / sequence', 'textarea'],
      ['transformationNotes', 'Transformation edges · what changed with orientation, diagram, Call, sound, or state', 'textarea'],
      ['interpretation', 'Interpretation · kept separate from witness', 'textarea'],
      ['sourceRefs', 'Source witnesses / corpus references', 'textarea'],
      ['runaReceipt', 'Runa / sound receipt', 'textarea'],
      ['replayFingerprint', 'Replay fingerprint', 'text'],
      ['canonBoundary', 'Canon boundary', 'select', false, ['Private observation · non-canon', 'Candidate for Steward review']],
      ['notes', 'Close notes / unresolved questions', 'textarea'],
    ],
    attachments: true,
  },
  relationships: {
    label: 'Relationships', glyph: '✧', category: 'relationships', description: 'People, bonds, agreements, histories, and living boundaries.',
    fields: [
      ['title', 'Name', 'text', true],
      ['relationship', 'Relationship', 'text'],
      ['status', 'Status', 'select', false, ['Active', 'Developing', 'Distant', 'Complex', 'Ended', 'Unknown']],
      ['communication', 'Communication and care', 'textarea'],
      ['boundaries', 'Boundaries and agreements', 'textarea'],
      ['details', 'History and notes', 'textarea'],
    ],
  },
  scenarios: {
    label: 'Scenarios', glyph: '▣', category: 'world', description: 'Possible scenes, rehearsals, encounters, and branches.',
    fields: [
      ['title', 'Scenario', 'text', true],
      ['status', 'Status', 'select', false, ['Seed', 'Planned', 'In progress', 'Resolved', 'Archived']],
      ['setting', 'Setting', 'text'],
      ['participants', 'Participants', 'text'],
      ['details', 'What happens', 'textarea', true],
      ['outcome', 'Preferred outcome or open question', 'textarea'],
    ],
  },
  calendar: {
    label: 'Calendar', glyph: '▦', category: 'world', description: 'World dates, appointments, festivals, deadlines, and recurring events.',
    fields: [
      ['title', 'Event', 'text', true],
      ['date', 'Start date and time', 'datetime-local'],
      ['endDate', 'End date and time', 'datetime-local'],
      ['recurrence', 'Recurrence', 'text'],
      ['location', 'Location', 'text'],
      ['details', 'Details', 'textarea'],
    ],
  },
  diary: {
    label: 'Diary', glyph: '✎', category: 'continuity', description: 'Private journal entries attached to a world and date.',
    fields: [
      ['title', 'Entry title', 'text', true],
      ['date', 'Date', 'date'],
      ['mood', 'Mood or tone', 'text'],
      ['details', 'Entry', 'textarea', true],
      ['tags', 'Tags', 'text'],
    ],
  },
  playlists: {
    label: 'Playlists', glyph: '♫', category: 'assets', description: 'Music, ambience, sound cues, and listening paths.',
    fields: [
      ['title', 'Playlist or track', 'text', true],
      ['platform', 'Source or platform', 'text'],
      ['url', 'Link', 'url'],
      ['purpose', 'World use', 'text'],
      ['details', 'Notes', 'textarea'],
    ],
  },
  visualisations: {
    label: 'Visualisations', glyph: '▧', category: 'assets', description: 'Scenes, sensory rehearsals, images, and guided sequences.',
    fields: [
      ['title', 'Visualisation', 'text', true],
      ['medium', 'Medium', 'select', false, ['Written', 'Image', 'Audio', 'Video', 'AR', 'Other']],
      ['cue', 'Opening cue', 'text'],
      ['details', 'Sequence and sensory details', 'textarea', true],
    ],
    attachments: true,
  },
  wardrobe: {
    label: 'Wardrobe', glyph: '♙', category: 'embodiment', description: 'Garments, armour, jewellery, prosthetics, and wearable supports.',
    fields: [
      ['title', 'Item', 'text', true],
      ['category', 'Category', 'text'],
      ['description', 'Appearance and materials', 'textarea'],
      ['accessibility', 'Fit and accessibility', 'textarea'],
      ['details', 'Notes', 'textarea'],
    ],
    attachments: true,
  },
  outfits: {
    label: 'Outfits', glyph: '⌂', category: 'embodiment', description: 'Complete looks assembled from wardrobe pieces.',
    fields: [
      ['title', 'Outfit', 'text', true],
      ['occasion', 'Occasion or context', 'text'],
      ['components', 'Components', 'textarea'],
      ['details', 'Fit, movement, and notes', 'textarea'],
    ],
    attachments: true,
  },
  belongings: {
    label: 'Belongings', glyph: '▰', category: 'assets', description: 'Objects carried, owned, inherited, crafted, or kept safe.',
    fields: [
      ['title', 'Belonging', 'text', true],
      ['category', 'Category', 'text'],
      ['location', 'Usual location', 'text'],
      ['description', 'Description', 'textarea'],
      ['details', 'History and significance', 'textarea'],
    ],
    attachments: true,
  },
  places: {
    label: 'Places', glyph: '⌂', category: 'world', description: 'Homes, routes, rooms, cities, landscapes, and thresholds.',
    fields: [
      ['title', 'Place', 'text', true],
      ['region', 'Region or parent place', 'text'],
      ['kind', 'Type', 'text'],
      ['purpose', 'Purpose', 'text'],
      ['description', 'Description and sensory character', 'textarea', true],
      ['details', 'Routes, access, and notes', 'textarea'],
    ],
    attachments: true,
  },
  'family-tree': {
    label: 'Family Tree', glyph: '⌘', category: 'relationships', description: 'Lineage, chosen family, households, and relationship edges.',
    fields: [
      ['title', 'Person or household', 'text', true],
      ['relation', 'Relationship', 'text'],
      ['connectedTo', 'Connected to', 'text'],
      ['dates', 'Dates or era', 'text'],
      ['details', 'Notes', 'textarea'],
    ],
  },
  'photo-gallery': {
    label: 'Photo Gallery', glyph: '▧', category: 'assets', description: 'Local images and visual references belonging to this world.',
    fields: [
      ['title', 'Image title', 'text', true],
      ['date', 'Date or era', 'text'],
      ['caption', 'Caption', 'textarea'],
      ['details', 'Source and notes', 'textarea'],
    ],
    attachments: true,
  },
});

export const WORLD_SECTION_DEFINITIONS = Object.freeze({
  'about-world': { label: 'About this World', glyph: 'ⓘ', section: 'about' },
  summon: { label: 'Summon', glyph: '⌁', section: 'summon' },
  'veil-mode': { label: 'Veil Mode', glyph: '◌', section: 'veil' },
  time: { label: 'World Clock', glyph: '◷', section: 'time' },
  arrival: { label: 'Arrival Context', glyph: '⌖', section: 'arrival' },
  identity: { label: 'About Me', glyph: '◇', section: 'identity' },
  competencies: { label: 'World Competencies', glyph: '✣', section: 'competencies' },
  'safety-weave': { label: 'Safety Weave', glyph: '⌘', section: 'safety' },
  'continuity-recall': { label: 'Continuity Recall', glyph: '↻', section: 'recall' },
  companion: { label: 'Companion Interface', glyph: '✦', section: 'companion' },
  theme: { label: 'Theme', glyph: '✦', section: 'theme' },
  worlds: { label: 'World Registry', glyph: '✧', section: 'worlds' },
});

export const IMPLEMENTED_APPLET_IDS = Object.freeze(new Set([
  'portal', 'worlds', 'about-world', 'summon', 'veil-mode', 'time', 'arrival',
  'timeline', 'scripts', 'records', 'seedhouse', 'ingest', 'aemeth-lens', 'identity', 'competencies', 'safety-weave',
  'continuity-recall', 'companion', 'relationships', 'scenarios', 'calendar',
  'diary', 'playlists', 'visualisations', 'appearance', 'wardrobe', 'outfits',
  'belongings', 'places', 'family-tree', 'photo-gallery', 'theme', 'forge',
  'waking-thread',
  'kelyran-school',
]));

export function createEmptyRoomCollections() {
  return Object.fromEntries(Object.keys(COLLECTION_ROOM_DEFINITIONS).map((id) => [id, []]));
}

export function normaliseRoomCollections(value) {
  const defaults = createEmptyRoomCollections();
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  for (const id of Object.keys(defaults)) {
    defaults[id] = Array.isArray(source[id]) ? source[id] : [];
  }
  return defaults;
}

export function roomDefinition(id) {
  return COLLECTION_ROOM_DEFINITIONS[id] || WORLD_SECTION_DEFINITIONS[id] || null;
}
