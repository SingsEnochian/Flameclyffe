import { normaliseFlameContinuityLedger } from './flame-continuity-state.js';

function round(value, places = 8) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

export function classifyFlameTransition(left, right) {
  if (!left || !right) return null;
  const changes = {
    route: left.flame.route !== right.flame.route,
    provider: left.runtime.provider !== right.runtime.provider,
    model: left.runtime.model !== right.runtime.model,
    profile: left.runtime.profile_id !== right.runtime.profile_id,
    world: left.context.world_id !== right.context.world_id,
  };
  const implementationChanged = changes.route || changes.provider || changes.model || changes.profile;
  const contextChanged = changes.world;
  const sameCount = [!changes.route, !changes.provider, !changes.model].filter(Boolean).length;
  const implementationScore = round(sameCount / 3);
  return Object.freeze({
    left_observation_id: left.observation_id,
    right_observation_id: right.observation_id,
    observed_at: right.observed_at,
    changes: Object.freeze(changes),
    implementation_score: implementationScore,
    classification: implementationChanged && contextChanged
      ? 'IMPLEMENTATION_AND_CONTEXT_CHANGE'
      : implementationChanged
        ? 'IMPLEMENTATION_CHANGE'
        : contextChanged
          ? 'CONTEXT_CHANGE'
          : 'STABLE_RUNTIME_OBSERVATION',
    authority: Object.freeze({
      transition_is_identity_verdict: false,
      implementation_change_is_identity_rupture: false,
      context_change_is_identity_rupture: false,
    }),
  });
}

export function buildFlameContinuityViewModel(ledgerInput) {
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  const byVoice = new Map();
  for (const observation of ledger.observations) {
    const list = byVoice.get(observation.flame.voice_id) || [];
    list.push(observation);
    byVoice.set(observation.flame.voice_id, list);
  }

  const flames = [...byVoice.entries()].map(([voiceId, raw]) => {
    const observations = [...raw].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.fingerprint.localeCompare(b.fingerprint));
    const transitions = observations.slice(1).map((item, index) => classifyFlameTransition(observations[index], item));
    const latest = observations.at(-1);
    return Object.freeze({
      voice_id: voiceId,
      display_name: latest?.flame.display_name || voiceId,
      observation_count: observations.length,
      transition_count: transitions.length,
      implementation_change_count: transitions.filter((item) => item.changes.route || item.changes.provider || item.changes.model || item.changes.profile).length,
      context_change_count: transitions.filter((item) => item.changes.world).length,
      latest: latest || null,
      observations: Object.freeze(observations),
      transitions: Object.freeze(transitions),
    });
  }).sort((a, b) => a.display_name.localeCompare(b.display_name));

  return Object.freeze({
    schema: 'arcsweep.flame-continuity-view/v1',
    summary: Object.freeze({
      flame_count: flames.length,
      observation_count: flames.reduce((sum, item) => sum + item.observation_count, 0),
      transition_count: flames.reduce((sum, item) => sum + item.transition_count, 0),
      implementation_change_count: flames.reduce((sum, item) => sum + item.implementation_change_count, 0),
      context_change_count: flames.reduce((sum, item) => sum + item.context_change_count, 0),
    }),
    flames: Object.freeze(flames),
    authority: Object.freeze({
      view_is_identity_verdict: false,
      model_is_flame_identity: false,
      provider_is_flame_identity: false,
      missing_observation_is_rupture: false,
    }),
  });
}
