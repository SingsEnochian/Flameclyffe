# Project Zero Connector Contract

Status: local-first architecture note for Project Zero Companion and future web connector work.

## Nocturne note

Project Zero is intentionally a local, non-web app at the moment.

It can become a website later.

When that happens, the website should expose enough structured metadata for Vee / build agents / connector code to connect Rowan's local Waking World resources to Runa, STARWELL, DEEP Observer, Writer Room, and the Hearthweave Altar without guessing.

## Local-first now

The desktop app is the trusted local root.

It owns:

- selected-folder permissions
- local file/folder bindings
- metadata extraction
- local bridge-event ledger
- dry-run previews
- local plug-in bus
- optional Supabase sync

It must not silently crawl the machine.

It must not upload private contents by default.

It must always preserve local-only, needs-review, and excluded scopes.

## Web-later shape

When Project Zero becomes a website, it should not replace the local app. It should become the coordination surface.

The website owns:

- readable dashboard
- connector setup
- project/plug-in registry
- Supabase-backed continuity views
- bridge-event search
- DEEP/Writer Room/Altar status
- user-visible consent gates

The local app remains the filesystem authority.

The website never pretends it has local file access unless the local app explicitly grants a bridge token or event.

## Connector handshake

The future connector needs a small, stable API/event contract.

Minimum objects:

```json
{
  "project_zero_version": "0.1",
  "device_id": "local-device-alias-not-public-id",
  "capabilities": [
    "folder-bindings",
    "bridge-event-bus",
    "local-metadata-ledger",
    "explicit-consent-gates",
    "dry-run-preview"
  ],
  "plugins": [
    "terra-aeterna-root",
    "deep-observer-bridge",
    "writer-room-rail",
    "hearthweave-altar-sound",
    "asset-watcher"
  ]
}
```

### Folder binding object

```json
{
  "binding_id": "terra_root",
  "label": "Terra Aeterna Root",
  "local_path_alias": "TerraAeterna/Music",
  "scope": "bridge-ready",
  "permissions": ["metadata-read", "manual-attach"],
  "created_at": "2026-05-30T00:00:00Z"
}
```

`local_path_alias` should avoid exposing the full local path publicly unless Rowan explicitly chooses to reveal it.

### Bridge event object

```json
{
  "event_id": "evt_local_or_uuid",
  "plugin_id": "terra-aeterna-root",
  "kind": "file_anchor",
  "direction": "waking_to_aeterna",
  "title": "Transformata audio added",
  "binding_id": "music_tones",
  "local_path_alias": "Music/transformata.mp3",
  "motifs": ["music", "resonance", "enochian", "threshold"],
  "deep_vector": {
    "P": 0.55,
    "C": 0.55,
    "R": 0.45,
    "E": 0.377,
    "M": 0.0,
    "A": 0.654
  },
  "visibility": "needs-review",
  "created_at": "2026-05-30T00:00:00Z",
  "rule": "Data sets atmosphere, not fate."
}
```

### Plug-in manifest object

```json
{
  "id": "deep-observer-bridge",
  "name": "DEEP Observer Bridge",
  "status": "planned",
  "permissions": ["local-storage", "supabase-sync-optional"],
  "emits": ["deep_state_update", "observer_condition_set", "sigil_signature"],
  "listens": ["file_anchor", "story_shard", "altar_working"]
}
```

## Connector routes / future API

Potential local app endpoints:

- `GET /project-zero/manifest`
- `GET /project-zero/bindings`
- `POST /project-zero/bridge-events/dry-run`
- `POST /project-zero/bridge-events/commit`
- `GET /project-zero/plugins`
- `POST /project-zero/plugins/:id/events`
- `GET /project-zero/deep-state/latest`

Potential website/Supabase tables:

- `project_zero_devices`
- `project_zero_folder_bindings`
- `project_zero_plugin_manifests`
- `project_zero_bridge_events`
- `project_zero_sync_sessions`

These can map into Observer tables later:

- `observer_condition_sets`
- `observer_bridge_events`
- `observer_trigger_watchers`
- `observer_sigil_renders`

## Boundary rule

Project Zero can become a website.

But local access remains local-first.

The web connector receives structured events and consented metadata, not raw dominion over Rowan's machine.

The bridge is lawful, explicit, and reversible.
