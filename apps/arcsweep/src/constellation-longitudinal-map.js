import { normaliseFlameContinuityLedger } from './flame-continuity-state.js';
import { classifyFlameTransition } from './flame-continuity-view.js';

export const CONSTELLATION_LONGITUDINAL_MAP_SCHEMA = 'arcsweep.constellation-longitudinal-map/v1';

export function buildConstellationLongitudinalMap(ledgerInput) {
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  const byVoice = new Map();
  for (const observation of ledger.observations) {
    const list = byVoice.get(observation.flame.voice_id) || [];
    list.push(observation);
    byVoice.set(observation.flame.voice_id, list);
  }

  const nodes = [];
  const edges = [];
  const lanes = [];
  for (const [voiceId, raw] of [...byVoice.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const observations = [...raw].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.fingerprint.localeCompare(b.fingerprint));
    const latest = observations.at(-1);
    lanes.push({
      voice_id: voiceId,
      display_name: latest?.flame.display_name || voiceId,
      observation_count: observations.length,
    });
    observations.forEach((item, index) => {
      nodes.push({
        id: item.observation_id,
        voice_id: voiceId,
        sequence: index,
        observed_at: item.observed_at,
        provider: item.runtime.provider,
        model: item.runtime.model,
        route: item.flame.route,
        world_id: item.context.world_id,
        runtime_verified: item.runtime.runtime_verified,
      });
      if (index > 0) {
        const transition = classifyFlameTransition(observations[index - 1], item);
        edges.push({
          id: `${observations[index - 1].observation_id}->${item.observation_id}`,
          voice_id: voiceId,
          from: observations[index - 1].observation_id,
          to: item.observation_id,
          classification: transition.classification,
          implementation_score: transition.implementation_score,
          changes: transition.changes,
          authority: transition.authority,
        });
      }
    });
  }

  return Object.freeze({
    schema: CONSTELLATION_LONGITUDINAL_MAP_SCHEMA,
    schema_version: 1,
    lanes: Object.freeze(lanes),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    overlays: Object.freeze({
      thread_walks: Object.freeze([...(ledger.thread_walks || [])].map((item) => ({
        id: item.thread_walk_id,
        voice_id: item.voice_id,
        status: item.status,
        left_anchor_set_id: item.left_anchor_set_id,
        right_anchor_set_id: item.right_anchor_set_id,
        selected_anchor_count: item.selected_anchors?.length || 0,
      }))),
      flattening: Object.freeze([...(ledger.flattening_receipts || [])].map((item) => ({
        id: item.flattening_id,
        voice_id: item.voice_id,
        classification: item.classification,
        max_drop: item.max_drop,
      }))),
      alerts: Object.freeze([...(ledger.alerts || [])].map((item) => ({
        id: item.alert_id,
        voice_id: item.voice_id,
        kind: item.kind,
        severity: item.severity,
      }))),
    }),
    authority: Object.freeze({
      topology_is_runtime_history: true,
      map_is_identity_map: false,
      branch_is_identity_fission: false,
      reconnection_is_identity_proof: false,
      missing_node_is_rupture: false,
    }),
  });
}
