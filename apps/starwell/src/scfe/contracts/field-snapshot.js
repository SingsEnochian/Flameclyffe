export const SCFE_SCHEMA_VERSION = 'scfe.field_snapshot.v0.1';

export const DEFAULT_EVIDENCE_LABELS = {
  astronomy: 'manual_or_calculated_input',
  ephemeris: 'manual_input_adapter',
  barbault_index: 'mathematical_index',
  astrology: 'theoretical_symbolic',
  sacred_geometry: 'theoretical_form_mapping',
  deep: 'theoretical_field_model',
  somatic: 'self_report',
  frequency: 'evidence_informed_not_medical',
  terra_aeterna: 'narrative_application',
  agency: 'user_chosen_action',
};

export function createDefaultFieldSnapshot(input = {}) {
  const now = new Date().toISOString();
  const snapshotId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scfe-${Date.now()}`;

  return {
    schema_version: SCFE_SCHEMA_VERSION,
    snapshot_id: snapshotId,
    created_at: now,
    target_timestamp: input.target_timestamp || now,
    timezone: input.timezone || 'America/New_York',
    location: input.location || {
      label: 'St. Augustine, Florida',
      latitude: null,
      longitude: null,
    },
    mode: input.mode || 'hearthfire',
    context: {
      project: 'Flameclyffe',
      world: 'Terra Aeterna',
      surface: 'Hearthfire',
      question: null,
      ...(input.context || {}),
    },
    ephemeris: {
      provider: 'manual_longitudes',
      calculation_status: 'manual_input_only',
      target_timestamp: input.target_timestamp || now,
      timezone: input.timezone || 'America/New_York',
      source_note: null,
      bodies: [],
      positions: {},
      warnings: [],
    },
    barbault: {
      source_type: 'manual_longitudes',
      bodies: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
      longitudes: {},
      pairwise_distances: {},
      cyclic_index: null,
      compression_level: null,
      phase_label: null,
      configurations: [],
      configuration_review: null,
      calibration_note: 'Compression thresholds are provisional until calibrated against historical Cyclic Index curves.',
    },
    deep: {
      P: null,
      C: null,
      R: null,
      E: null,
      M: null,
      A: null,
      dp_dt: null,
      field_label: null,
      pacing_recommendation: null,
    },
    sacred_geometry: {
      primary_form: null,
      secondary_forms: [],
      interaction_points: [],
      render_payload: {},
    },
    somatic: {
      activation: null,
      fatigue: null,
      pain: null,
      migraine: false,
      tinnitus: null,
      body_yes: null,
      body_no: null,
      capacity_label: null,
      interface_safety_mode: 'gentle',
    },
    frequency_protocol: null,
    terra_aeterna: {
      world_mood: null,
      ritual_theme: null,
      story_prompt: null,
      canon_candidate: false,
      archive_tags: [],
    },
    agency: {
      prompt: null,
      suggested_actions: [],
      energy_cost: 'low',
      plain_pass: null,
    },
    evidence_labels: DEFAULT_EVIDENCE_LABELS,
  };
}

export function validateFieldSnapshot(snapshot) {
  const required = [
    'schema_version',
    'snapshot_id',
    'created_at',
    'target_timestamp',
    'timezone',
    'mode',
    'context',
    'ephemeris',
    'barbault',
    'deep',
    'sacred_geometry',
    'somatic',
    'terra_aeterna',
    'agency',
    'evidence_labels',
  ];

  const missing = required.filter((key) => !(key in snapshot));
  if (missing.length) {
    throw new Error(`Invalid SCFE snapshot: missing ${missing.join(', ')}`);
  }

  if (snapshot.schema_version !== SCFE_SCHEMA_VERSION) {
    throw new Error(`Unsupported SCFE schema version: ${snapshot.schema_version}`);
  }

  return snapshot;
}
