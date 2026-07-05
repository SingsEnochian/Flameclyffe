export const AGENCY_SWITCH_COMMANDS = [
  {
    id: 'nope_lever',
    label: 'Nope Lever',
    invocation: 'nope',
    purpose: 'Stop the active inquiry without needing to justify or complete the scene.',
    lab_behaviour: {
      processing: 'stop_active_inquiry',
      sound: 'suppressed',
      motion: 'minimal',
      archive: 'optional_log_only',
      copy: 'Nope registered. Nothing more is required.',
    },
  },
  {
    id: 'change_channel',
    label: 'Change Channel',
    invocation: 'please change channel',
    purpose: 'Keep agency and continuity while redirecting away from the current scene, tone, or frame.',
    lab_behaviour: {
      processing: 'redirect_frame',
      sound: 'step_down_or_swap',
      motion: 'reduce_complexity',
      archive: 'preserve_thread_without_expansion',
      copy: 'Channel changed. Same body, safer scene.',
    },
  },
  {
    id: 'soft_landing',
    label: 'Soft Landing',
    invocation: 'soft landing',
    purpose: 'Lower sensory load, simplify the interface, and return to quiet orientation.',
    lab_behaviour: {
      processing: 'simplify_and_ground',
      sound: 'silence_or_brown_noise_only',
      motion: 'reduced_motion',
      archive: 'save_only_if_user_chooses',
      copy: 'Soft landing. Low light, low demand, no proving.',
    },
  },
  {
    id: 'log_only',
    label: 'Log Only Basket',
    invocation: 'log only',
    purpose: 'Record the signal without analysing, canonising, escalating, or requiring a next action.',
    lab_behaviour: {
      processing: 'record_without_interpretation',
      sound: 'unchanged_or_off',
      motion: 'unchanged_or_low',
      archive: 'local_only_non_canon',
      copy: 'Logged only. Held, not opened.',
    },
  },
  {
    id: 'standard',
    label: 'Standard Exploration',
    invocation: 'continue',
    purpose: 'Continue ordinary read-only exploration when capacity and consent are present.',
    lab_behaviour: {
      processing: 'continue_read_only_exploration',
      sound: 'allowed_if_protocol_selects_it',
      motion: 'standard_accessible_motion',
      archive: 'user_chosen',
      copy: 'Standard exploration is available.',
    },
  },
];

const COMMAND_BY_ID = Object.fromEntries(AGENCY_SWITCH_COMMANDS.map((command) => [command.id, command]));

export function createAgencySwitchboard({ deep = {}, somatic = {}, terra_aeterna = {} } = {}) {
  const active_channel = selectAgencyChannel({ deep, somatic });
  const command = COMMAND_BY_ID[active_channel] || COMMAND_BY_ID.standard;

  return {
    schema: 'scfe.agency_switchboard.v0.1',
    active_channel,
    active_label: command.label,
    recommended_command: command.invocation,
    plain_language: command.lab_behaviour.copy,
    consent_anchor: 'Agency first. Intensity second. Meaning only with consent.',
    field_context: terra_aeterna.world_mood || deep.field_label || 'field_observation',
    reasons: deriveSwitchReasons({ deep, somatic, active_channel }),
    available_channels: AGENCY_SWITCH_COMMANDS.map(({ id, label, invocation, purpose }) => ({
      id,
      label,
      invocation,
      purpose,
    })),
    lab_behaviour: command.lab_behaviour,
  };
}

export function selectAgencyChannel({ deep = {}, somatic = {} } = {}) {
  if (somatic.body_no || somatic.interface_safety_mode === 'paused') return 'nope_lever';
  if (somatic.migraine || somatic.interface_safety_mode === 'low_light_silent') return 'soft_landing';
  if (somatic.activation === 'high' && somatic.fatigue === 'high') return 'change_channel';
  if ((deep.P ?? 0) > 0.82 || (deep.E ?? 0) > 0.68) return 'change_channel';
  if (somatic.fatigue === 'high' || somatic.pain === 'high' || (deep.A ?? 1) < 0.6) return 'log_only';
  return 'standard';
}

function deriveSwitchReasons({ deep = {}, somatic = {}, active_channel }) {
  const reasons = [];

  if (somatic.body_no) reasons.push('body_no_present');
  if (somatic.migraine) reasons.push('migraine_or_low_light_request');
  if (somatic.activation === 'high') reasons.push('high_activation');
  if (somatic.fatigue === 'high') reasons.push('high_fatigue');
  if (somatic.pain === 'high') reasons.push('high_pain');
  if ((deep.P ?? 0) > 0.82) reasons.push('pressure_spike');
  if ((deep.E ?? 0) > 0.68) reasons.push('entropy_spike');
  if ((deep.A ?? 1) < 0.6) reasons.push('agency_bandwidth_low');

  return reasons.length ? reasons : [`${active_channel}_available`];
}
