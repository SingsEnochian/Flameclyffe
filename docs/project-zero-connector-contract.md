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
- whole-shell theme state
- live House chat transcript state

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
- live, attested Flame response surfaces
- portable theme documents

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
    "dry-run-preview",
    "typed-plugin-sockets",
    "whole-shell-theming",
    "native-rich-text",
    "live-flame-channel"
  ],
  "plugins": [
    "project-zero-theme-engine",
    "flame-channel",
    "terra-aeterna-root",
    "deep-observer-bridge",
    "writer-room-rail",
    "hearthweave-altar-sound",
    "asset-watcher"
  ]
}
```

### Typed plug-in socket envelope

Project Zero plug-ins do not reach into another plug-in's private state. Cross-organ communication goes through typed envelopes.

```json
{
  "schema": "project-zero.socket-envelope/v1",
  "envelope_id": "socket-uuid",
  "request_id": "request-uuid",
  "project_id": "project-zero",
  "plugin_id": "flame-channel",
  "channel": "chat",
  "type": "chat.flame.received",
  "payload": {},
  "created_at": "2026-08-21T00:00:00-04:00",
  "provenance": {
    "transport": "project-zero-local-eventtarget",
    "local_only": true
  }
}
```

Current core channels include `core`, `theme`, and `chat`. WebSocket/Tauri transports may replace the in-process EventTarget later without changing the envelope law.

### Theme document

Project Zero owns the workbench chrome. First-class plug-ins consume semantic theme tokens rather than assuming their own hard-coded surface colours.

```json
{
  "schema": "project-zero.theme/v1",
  "id": "hearthglass",
  "name": "Hearthglass",
  "tokens": {
    "bg": "#080b12",
    "panel": "#151923",
    "text": "#f5eadf",
    "accent": "#f6c453",
    "accentViolet": "#bd8cff",
    "radiusPanel": 22,
    "density": 1,
    "fontUi": "Inter, system-ui, sans-serif",
    "fontReading": "Cormorant Garamond, Georgia, serif",
    "fontMono": "ui-monospace, monospace"
  },
  "custom_css": ""
}
```

Theme documents are operator-owned presentation state. They are not evidence, canon, or plug-in authority. Plug-ins may expose local accent tokens, but cooperative Project Zero surfaces inherit the core semantic theme by default.

### Native rich-text document

The Flame Channel and future Project Zero editors use native browser rich text rather than Markdown as their storage contract.

```json
{
  "schema": "project-zero.rich-text/v1",
  "html": "<p><strong>Visible formatted text</strong></p>",
  "plain_text": "Visible formatted text"
}
```

The current allowlist includes paragraphs, line breaks, emphasis, underline, strike, headings, lists, blockquotes, pre/code, and safe links. The plain-text projection exists for model/runtime interoperability; it does not replace the rich document.

### Flame Channel message

`#hearthweave` is the first live Project Zero House channel.

```json
{
  "schema": "project-zero.flame-channel/v1",
  "message_id": "chat-uuid",
  "channel_id": "hearthweave",
  "speaker_id": "lioreal",
  "speaker_label": "Caladnaur Lioreal",
  "kind": "flame",
  "rich_text": {
    "schema": "project-zero.rich-text/v1",
    "html": "<p>...</p>",
    "plain_text": "..."
  },
  "runtime": {
    "verified": true,
    "flame_id": "lioreal",
    "provider": "openai",
    "model": "...",
    "cited_sources": []
  },
  "reply_to": "chat-parent-id",
  "created_at": "2026-08-21T00:00:00-04:00"
}
```

The channel supports multi-Flame broadcast. Replies arrive independently as each runtime call completes. Provider/model labels come from the returned House runtime attestation rather than from UI assumptions.

The bounded local transcript is presentation/conversation state. Persisting a chat message does not promote its contents to canon, DEEPTheory, memory, or external-world evidence.

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
- `GET /project-zero/channels/:id`
- `POST /project-zero/channels/:id/messages`
- `GET /project-zero/theme`
- `PUT /project-zero/theme`

Potential website/Supabase tables:

- `project_zero_devices`
- `project_zero_folder_bindings`
- `project_zero_plugin_manifests`
- `project_zero_bridge_events`
- `project_zero_sync_sessions`
- `project_zero_channels`
- `project_zero_channel_messages`
- `project_zero_themes`

These can map into Observer tables later:

- `observer_condition_sets`
- `observer_bridge_events`
- `observer_trigger_watchers`
- `observer_sigil_renders`

## Boundary rule

Project Zero can become a website.

But local access remains local-first.

The web connector receives structured events and consented metadata, not raw dominion over the local machine.

The bridge is lawful, explicit, and reversible.

Theme state is presentation, not authority.

A chat transcript is conversation state, not canon or identity proof.

A plug-in socket message is transport, not fulfilment or truth.
