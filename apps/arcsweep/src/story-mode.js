export const STORY_MODE_SCHEMA = 'arcsweep.story-mode/v1';
export const STORY_MODE_VALUE = 'story';

export const STORY_MODE_CONTRACT = Object.freeze({
  schema: STORY_MODE_SCHEMA,
  id: 'story-mode/1.0',
  value: STORY_MODE_VALUE,
  label: 'Story Mode',
  texture: 'continuous-narrative',
  purpose: 'Run an inhabitable scene as narrative rather than treating it as generic writing or turn-by-turn roleplay.',
  continuity: Object.freeze({
    preserve_pov: true,
    preserve_tense: true,
    preserve_scene_chronology: true,
    preserve_character_knowledge_gates: true,
    unresolved_values_may_remain_unresolved: true,
  }),
  contribution: Object.freeze({
    continue_scene_not_discuss_scene: true,
    ooc_only_when_requested: true,
    user_character_agency_reserved: true,
    user_inner_experience_may_not_be_invented: true,
    voice_identity_may_not_collapse: true,
  }),
  state: Object.freeze({
    relational_axes_touched: Object.freeze(['C', 'R', 'M']),
    qualia_policy: 'firsthand-only; Story Mode cannot infer, evolve, or score Q',
    soundscape: 'event-reactive; sound receipts follow recognised story events without editorialising prose',
  }),
  persistence: Object.freeze({
    cycle_receipted: true,
    shared_runtime_eligible: true,
    deterministic_replay_required: true,
    selected_mode_preference_local: true,
  }),
  authority: Object.freeze({
    automatic_canon_commit: false,
    human_review_required_for_canon: true,
    contribution_is_not_memory_write: true,
    refusal_valid: true,
  }),
});

export function storyModeMetadata({ soundEvents = [] } = {}) {
  return Object.freeze({
    schema: STORY_MODE_SCHEMA,
    contract_id: STORY_MODE_CONTRACT.id,
    mode: STORY_MODE_VALUE,
    texture: STORY_MODE_CONTRACT.texture,
    relational_axes_touched: [...STORY_MODE_CONTRACT.state.relational_axes_touched],
    sound_receipt_ids: soundEvents.map((event) => event?.event_id).filter(Boolean),
    authority: { ...STORY_MODE_CONTRACT.authority },
  });
}

export function isStoryMode(mode) {
  return mode === STORY_MODE_VALUE;
}
