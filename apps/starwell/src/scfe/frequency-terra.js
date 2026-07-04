export const FREQUENCY_PROTOCOLS = [
  {
    id: 'hearthfire_alpha_grounding_v0_1',
    name: 'Hearthfire Alpha Grounding',
    carrier_frequency_hz: 528,
    binaural_difference_hz: 10,
    amplitude_modulation_hz: 0.1,
    noise_colour: 'brown',
    duration_seconds: 420,
    fade_in_seconds: 20,
    fade_out_seconds: 30,
    volume_ceiling: 'low',
    purpose: 'grounded relaxed awareness',
    evidence_label: 'evidence_informed_not_medical',
    symbolic_label: 'repair / hearth / coherence',
    safety_notes: [
      'low volume only',
      'slow fade in',
      'avoid harsh treble',
      'stop if tinnitus, migraine, nausea, or agitation increases',
    ],
  },
  {
    id: 'hearthfire_theta_ritual_v0_1',
    name: 'Hearthfire Theta Ritual',
    carrier_frequency_hz: 432,
    binaural_difference_hz: 4.5,
    amplitude_modulation_hz: 0.1,
    noise_colour: 'pink',
    duration_seconds: 360,
    fade_in_seconds: 25,
    fade_out_seconds: 35,
    volume_ceiling: 'low',
    purpose: 'ritual / liminal writing / dreamwork',
    evidence_label: 'experimental_symbolic',
    symbolic_label: 'threshold / water / temple',
    safety_notes: [
      'not for driving',
      'not for task focus',
      'use only when body capacity is stable',
    ],
  },
  {
    id: 'hearthfire_delta_rest_v0_1',
    name: 'Hearthfire Delta Rest',
    carrier_frequency_hz: 396,
    binaural_difference_hz: 1.5,
    amplitude_modulation_hz: 0.1,
    noise_colour: 'brown',
    duration_seconds: 480,
    fade_in_seconds: 30,
    fade_out_seconds: 45,
    volume_ceiling: 'low',
    purpose: 'rest / sleep support',
    evidence_label: 'experimental_supportive_not_medical',
    symbolic_label: 'release / cave / dark water',
    safety_notes: [
      'rest only',
      'slow fade in and out',
      'stop if body alarm increases',
    ],
  },
];

export function selectFrequencyProtocol({ deep, somatic }) {
  if (somatic.interface_safety_mode === 'paused') return null;
  if (somatic.interface_safety_mode === 'low_light_silent') return null;
  if (somatic.body_no) return null;

  if (somatic.fatigue === 'high') {
    return getFrequencyProtocol('hearthfire_delta_rest_v0_1');
  }

  if (deep.R > 0.75 && somatic.capacity_label === 'stable') {
    return getFrequencyProtocol('hearthfire_theta_ritual_v0_1');
  }

  return getFrequencyProtocol('hearthfire_alpha_grounding_v0_1');
}

export function getFrequencyProtocol(id) {
  return FREQUENCY_PROTOCOLS.find((protocol) => protocol.id === id) || null;
}

export function mapTerraAeterna({ deep, sacred_geometry, barbault, somatic, context = {} }) {
  const worldMood = deriveWorldMood(deep, somatic);
  const ritualTheme = deriveRitualTheme(sacred_geometry, barbault);

  return {
    world_mood: worldMood,
    ritual_theme: ritualTheme,
    story_prompt: deriveStoryPrompt({ worldMood, ritualTheme, somatic, context }),
    canon_candidate: false,
    archive_tags: ['scfe', 'hearthfire', 'terra_aeterna', ritualTheme].filter(Boolean),
  };
}

function deriveWorldMood(deep, somatic) {
  if (somatic.interface_safety_mode === 'paused') return 'held_rest';
  if (deep.field_label === 'threshold_vessel') return 'threshold_rebuilding';
  if (deep.P > 0.72 && deep.E > 0.5) return 'storm_within_limits';
  if (deep.C > 0.66) return 'coherent_hearth';
  return 'watchful_observatory';
}

function deriveRitualTheme(geometry, barbault) {
  if (geometry.primary_form === 'cradle_vessel') return 'vessel_and_bridge';
  if (barbault.compression_level === 'wide_distribution') return 'open_orrery';
  if (geometry.primary_form === 'pressure_cross') return 'structure_and_pacing';
  return 'field_witness';
}

function deriveStoryPrompt({ worldMood, ritualTheme, somatic, context }) {
  if (somatic.interface_safety_mode === 'paused') {
    return 'The Templehouse holds the room without asking for performance.';
  }

  if (worldMood === 'threshold_rebuilding') {
    return 'What can Hearthweave build that does not repeat the old harm?';
  }

  if (ritualTheme === 'open_orrery') {
    return 'What becomes possible when the field opens and no single pattern owns the sky?';
  }

  return context.question || 'What does this field ask us to notice, gently and without force?';
}

export function createAgencyOutput({ deep, somatic, terra_aeterna }) {
  if (somatic.interface_safety_mode === 'paused') {
    return {
      prompt: 'Body-no is active. Stop here and let the field be held without action.',
      suggested_actions: ['rest', 'plain_pass'],
      energy_cost: 'none',
      plain_pass: 'Stop. Rest. No action required.',
    };
  }

  const gentle = somatic.interface_safety_mode === 'gentle' || deep.A < 0.6;

  return {
    prompt: gentle
      ? 'Choose one small action: read the field, export the snapshot, or write one sentence.'
      : terra_aeterna.story_prompt,
    suggested_actions: gentle ? ['read', 'export_json', 'one_sentence'] : ['observe', 'write', 'archive_candidate'],
    energy_cost: gentle ? 'low' : 'moderate',
    plain_pass: gentle ? 'Gentle mode. One tiny step only.' : 'Read the field and choose the next action.',
  };
}
