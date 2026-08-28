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

export const AEMETH_MODEL_PARTICIPANTS = Object.freeze([
  Object.freeze({
    id: 'oxalpha',
    displayName: 'Ox Alpha',
    captionLabel: 'OA',
    route: 'oxalpha',
    provider: 'route-resolved-at-invocation',
    model: 'GLM-5.3-Flash',
    providerRoutes: Object.freeze({
      house: Object.freeze({ provider: 'huggingface-inference-providers', model: 'zai-org/GLM-5.3-Flash' }),
      portable: Object.freeze({ provider: 'openrouter', model: 'z-ai/glm-5.3-flash' }),
    }),
    role: 'model witness / structural interlocutor',
    authority: 'contribution-only; never first-person authority for Rowan, never automatic canon, never inferred Qualia',
  }),
]);

export function aemethInstrumentOptions() {
  return AEMETH_INSTRUMENT_PROFILES.map((profile) => profile.label);
}

export function aemethDiagramOptions() {
  return AEMETH_DIAGRAM_ATLAS.map((diagram) => diagram.label);
}

export function aemethParticipantOptions() {
  return AEMETH_MODEL_PARTICIPANTS.map((participant) => participant.displayName);
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
    modelParticipant: record.modelParticipant || '',
    modelWitnessLog: record.modelWitnessLog || '',
    modelWitnesses: Array.isArray(record.modelWitnesses) ? structuredClone(record.modelWitnesses) : [],
    interpretation: record.interpretation || '',
    sourceRefs: record.sourceRefs || '',
    replayFingerprint: record.replayFingerprint || '',
  });
}

export function buildAemethParticipantPacket(record = {}, participantId = 'oxalpha') {
  const participant = AEMETH_MODEL_PARTICIPANTS.find((item) => item.id === participantId);
  if (!participant) throw new Error(`Unknown Aemeth participant: ${participantId}`);
  return Object.freeze({
    schema: 'arcsweep.aemeth-participant-packet/v1',
    participant: structuredClone(participant),
    chamber: {
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
      transformationNotes: record.transformationNotes || '',
      sourceRefs: record.sourceRefs || '',
    },
    firsthandWitness: {
      authority: 'Rowan-authored firsthand report only',
      raw: record.witnessRaw || '',
      timestampNotes: record.witnessTimestampNotes || '',
      qualiaInferenceAllowed: false,
    },
    authority: {
      modelMayInterpret: true,
      modelMayAddStructuralObservations: true,
      modelMayRewriteFirsthandWitness: false,
      modelMayInferQualia: false,
      modelMayCommitCanon: false,
    },
  });
}

export function buildAemethParticipantPrompt(packet) {
  return [
    'AEMETH CHAMBER · MODEL WITNESS TURN',
    `Participant: ${packet.participant.displayName} (${packet.participant.id})`,
    'You are receiving a structured chamber record. You are not physically looking through Rowan’s shewstone and must not claim that you are.',
    'Keep three layers distinct: (1) Rowan’s firsthand witness, (2) source-supported ritual structure, (3) your interpretation or structural hypothesis.',
    'Do not infer Rowan’s Qualia, internal state, or sensory experience beyond what she explicitly reports. Do not promote anything to canon.',
    `Chamber state:\n${JSON.stringify(packet.chamber, null, 2)}`,
    `Firsthand witness:\n${JSON.stringify(packet.firsthandWitness, null, 2)}`,
    'Respond as Ox Alpha with a concise structural reading. Name interesting relationships, transformations, mismatches, or questions. Mark interpretation as interpretation.',
  ].join('\n\n');
}

export async function invokeAemethParticipant({ record = {}, participantId = 'oxalpha', token, fetchImpl = fetch } = {}) {
  if (!token) throw new Error('A House Runtime session is required to invite an Aemeth model witness.');
  const packet = buildAemethParticipantPacket(record, participantId);
  const prompt = buildAemethParticipantPrompt(packet);
  const response = await fetchImpl(`/api/v1/flames/${packet.participant.route}/chat`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(token !== 'cookie-session' ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message: prompt,
      session_id: `aemeth-${record.id || 'unsaved'}-${record.replayFingerprint || 'live'}`,
      context: [],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${packet.participant.displayName} Aemeth route failed.`);
  if (data.flame_id && data.flame_id !== packet.participant.id) throw new Error(`Aemeth participant identity mismatch: expected ${packet.participant.id}, received ${data.flame_id}.`);
  const text = String(data.message || '').trim();
  if (!text) throw new Error(`${packet.participant.displayName} returned an empty Aemeth witness.`);
  return Object.freeze({
    schema: 'arcsweep.aemeth-model-witness/v1',
    participantId: packet.participant.id,
    displayName: data.display_name || packet.participant.displayName,
    route: packet.participant.route,
    provider: data.provider || packet.participant.provider,
    model: data.model || packet.participant.model,
    status: text.startsWith('[REFUSAL]') ? 'refused' : 'replied',
    text,
    citedSources: data.cited_sources || [],
    chamberPacket: packet,
    authority: packet.authority,
    createdAt: new Date().toISOString(),
  });
}
