# Observer Schema Crosswalk

Status: alignment note. Do not create a second Observer schema until this map is reviewed.

Runa's Observer Sigil Bridge spec proposes one schema family, while Flameclyffe Supabase currently implements another. They are compatible, but they should be reconciled before new tables are added.

## Existing Flameclyffe tables

### `deep_observer_events`

Current role: main event log.

Closest proposed-table match: `observer_bridge_events` plus part of `observer_condition_sets`.

Use for observed events, symbolic events, manual notes, external imports, story shards, instrument states, and bridge-relevant records. Existing fields such as `state_vector`, `location_context`, `tags`, `entities`, `links`, `raw_payload`, `confidence_mode`, and `visibility` already carry much of the condition-set payload.

### `deep_observer_event_relations`

Current role: graph edges between events or between an event and a target table.

Closest proposed-table match: relationship layer between `observer_bridge_events`, Codex entries, STARWELL worlds/locations, and watcher outputs.

Use for typed relations such as `inspired_by`, `attached_to`, `mirrors`, `candidate_match`, `derived_from`, `renders_as`, or `watches_for`.

### `deep_observer_event_links`

Current role: file, URL, repo, commit, and external-reference links for Observer events.

Closest proposed-table match: bridge links and sigil render references.

Use for receipts, file anchors, GitHub references, Drive/Notion references, audio files, images, rendered SVGs, and exported documents.

### `observer_handoff_queue`

Current role: work queue for notes, code handoffs, and reviewable tasks.

Closest proposed-table match: implementation queue, not a public bridge-event table.

Treat this as private or service-role-first by default. It should not become a public inbox without explicit policies and UI gating.

## Proposed Runa spec tables

### `observer_condition_sets`

May become a view or helper table later. For now, prefer embedding condition snapshots in `deep_observer_events.state_vector`, `location_context`, and `raw_payload` unless repeated condition sets become hard to query.

### `observer_bridge_events`

Likely already covered by `deep_observer_events`. Avoid duplicating until there is a clear reason to split bridge events from general Observer events.

### `observer_trigger_watchers`

Not yet implemented. This should be added only when watch-window language, probability fields, and privacy rules are settled.

### `observer_sigil_renders`

Not yet implemented. This can start as `deep_observer_event_links` rows with `link_type = 'sigil_render'`, then graduate to its own table if render metadata becomes complex.

## Recommendation

Use `deep_observer_events` as the canonical root for now.

Add helper views or small columns before adding parallel tables. The next safe implementation slice is documentation plus frontend adapters, not schema multiplication.

## Claim and consent boundary

Observer records may describe correspondences, candidate resonance, symbolic parallels, and evidence-backed observations. They must not present probability windows, reverse watches, or symbolic matches as fate.
