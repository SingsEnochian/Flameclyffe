export const AEMETH_INSTRUMENT_PROFILES = Object.freeze([
  Object.freeze({
    id: 'aemeth-shewstone-001',
    label: 'Aemeth Shewstone 001 · physical sphere',
    medium: 'physical',
    geometry: 'clear spherical medium with subsurface Sigillum Dei Aemeth on a central plane',
    observerAxis: 'eye → sphere → embedded sigillum → depth',
    provenance: 'Rowan private instrument; visual reference photographs held privately outside the public repository',
  }),
  Object.freeze({
    id: 'aemeth-digital-lens-v1',
    label: 'Aemeth Lens v1 · digital chamber',
    medium: 'digital',
    geometry: 'refractive sphere around a source-faithful vector sigillum and selectable ritual geometry',
    observerAxis: 'camera → refractive sphere → embedded sigillum → chamber depth',
    provenance: 'Arcsweep reconstruction; canonical diagrams remain source-versioned and non-canon evidence',
  }),
  Object.freeze({
    id: 'aemeth-hybrid-v1',
    label: 'Aemeth Hybrid v1 · physical shewstone + digital chamber',
    medium: 'hybrid',
    geometry: 'physical shewstone as observer medium; Arcsweep supplies chamber geometry, calls, timing, sound, witness capture, and replay',
    observerAxis: 'observer → physical sphere while digital chamber maintains surrounding state',
    provenance: 'Arcsweep hybrid instrument contract',
  }),
]);

export const AEMETH_RITUAL_PHASES = Object.freeze([
  'Preparation',
  'Configuration',
  'Orientation',
  'Call',
  'Observation',
  'Transition',
  'Close',
  'Interpretation',
  'Replay review',
]);

export const AEMETH_DIAGRAM_ATLAS = Object.freeze([
  Object.freeze({ id: 'sigillum-dei-aemeth', label: 'Sigillum Dei Aemeth', family: 'heptarchic apparatus', versionPolicy: 'preserve source variants independently' }),
  Object.freeze({ id: 'holy-table', label: 'Holy Table / Table of Covenant', family: 'heptarchic apparatus', versionPolicy: 'preserve source variants independently' }),
  Object.freeze({ id: 'heptarchic-lamen', label: 'Heptarchic Lamen', family: 'heptarchic apparatus', versionPolicy: 'earlier and corrected forms remain distinct' }),
  Object.freeze({ id: 'pele-ring', label: 'PELE Ring', family: 'heptarchic apparatus', versionPolicy: 'source-witnessed reconstruction' }),
  Object.freeze({ id: 'ensigns-of-creation', label: 'Seven Ensigns of Creation', family: 'heptarchic apparatus', versionPolicy: 'seven diagrams remain individually addressable' }),
  Object.freeze({ id: 'tabula-bonorum', label: 'Tabula Bonorum / 49 Good Angels', family: 'heptarchic tables', versionPolicy: 'preserve table derivation and source witness' }),
  Object.freeze({ id: 'twelve-by-seven-table', label: 'Twelve-by-Seven Table', family: 'heptarchic tables', versionPolicy: 'preserve both source forms' }),
  Object.freeze({ id: 'great-table', label: 'Great Table', family: 'enochiana', versionPolicy: 'historical recensions are separate states' }),
  Object.freeze({ id: 'tablet-of-union', label: 'Tablet of Union', family: 'enochiana', versionPolicy: 'source-versioned' }),
  Object.freeze({ id: 'watchtower-air', label: 'Elemental Watchtower · Air', family: 'enochiana', versionPolicy: 'source-versioned' }),
  Object.freeze({ id: 'watchtower-water', label: 'Elemental Watchtower · Water', family: 'enochiana', versionPolicy: 'source-versioned' }),
  Object.freeze({ id: 'watchtower-fire', label: 'Elemental Watchtower · Fire', family: 'enochiana', versionPolicy: 'source-versioned' }),
  Object.freeze({ id: 'watchtower-earth', label: 'Elemental Watchtower · Earth', family: 'enochiana', versionPolicy: 'source-versioned' }),
  Object.freeze({ id: 'ninety-one-parts', label: '91 Parts of Earth', family: 'enochiana', versionPolicy: 'source-versioned geographic/table mapping' }),
  Object.freeze({ id: 'liber-logaeth', label: 'Liber Logaeth / Angelic table structures', family: 'logaeth', versionPolicy: 'manuscript/source variants remain explicit' }),
]);

export function aemethInstrumentOptions() {
  return AEMETH_INSTRUMENT_PROFILES.map((profile) => profile.label);
}

export function aemethDiagramOptions() {
  return AEMETH_DIAGRAM_ATLAS.map((diagram) => diagram.label);
}

export function createAemethReplayEnvelope(record = {}) {
  return Object.freeze({
    schema: 'arcsweep.aemeth-replay/v1',
    instrumentProfile: record.instrumentProfile || '',
    phase: record.phase || '',
    ask: record.ask || '',
    observerRole: record.observerRole || '',
    orientation: record.orientation || '',
    gazeMode: record.gazeMode || '',
    activeDiagram: record.activeDiagram || '',
    activeCall: record.activeCall || '',
    departurePremaqc: record.departurePremaqc || '',
    chamberConfiguration: record.chamberConfiguration || '',
    witnessRaw: record.witnessRaw || '',
    witnessTimestampNotes: record.witnessTimestampNotes || '',
    transformationNotes: record.transformationNotes || '',
    interpretation: record.interpretation || '',
    sourceRefs: record.sourceRefs || '',
    replayFingerprint: record.replayFingerprint || '',
  });
}
