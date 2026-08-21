# Project Zero Companion Connector Contract

Status: Flameclyffe-side interoperability contract for Nocturne's Project Zero.

## Ownership boundary

**Project Zero is Nocturne's project.**

This document does not specify Project Zero's internal architecture. It specifies what the Flameclyffe **Project Zero Companion** can expose so Nocturne's Project Zero may connect to it without guessing.

Authority split:

- **Nocturne / Project Zero** owns Project Zero's project-management surface, native socket/plugin architecture, native themes, persistence, instruments, UI and release decisions.
- **Flameclyffe / Project Zero Companion** owns the bridge code in this repository, House Runtime Flame rail, bridge metadata, optional local filesystem bindings, adapter schemas and connector-side presentation state.
- Crossing the seam requires an explicit agreed connector. A compatible Companion schema is not automatically a Project Zero schema.

`Nocturne / Project Zero ⇄ agreed connector ⇄ Flameclyffe / Project Zero Companion`

## Companion local-first shape

The Companion may own:

- explicitly selected folder bindings
- local metadata extraction
- local bridge-event ledger and dry-run previews
- Flameclyffe-side adapter registry
- typed Companion socket/event bus
- optional Supabase bridge sync
- Companion theme-interoperability state
- Companion live House chat transcript state

It must not silently crawl the machine, upload private contents by default, or represent itself as Project Zero's core.

## Connector handshake

A future agreed connector can advertise Companion capabilities without claiming Project Zero internals:

```json
{
  "schema": "flameclyffe.project-zero-companion.handshake/v1",
  "bridge_owner": "flameclyffe",
  "integration_target": "nocturne-project-zero",
  "companion_version": "0.1",
  "device_id": "local-device-alias-not-public-id",
  "capabilities": [
    "folder-bindings",
    "bridge-event-bus",
    "local-metadata-ledger",
    "explicit-consent-gates",
    "dry-run-preview",
    "typed-companion-sockets",
    "theme-interoperability",
    "native-rich-text",
    "live-flame-channel"
  ]
}
```

## Typed Companion socket envelope

Companion adapters do not reach into another adapter's private state. Cross-organ communication on our side goes through typed envelopes.

```json
{
  "schema": "flameclyffe.project-zero-companion.socket-envelope/v1",
  "envelope_id": "socket-uuid",
  "request_id": "request-uuid",
  "project_id": "project-zero-external",
  "plugin_id": "project-zero-companion-flame-channel",
  "channel": "chat",
  "type": "chat.flame.received",
  "payload": {},
  "created_at": "2026-08-21T00:00:00-04:00",
  "provenance": {
    "owner": "flameclyffe",
    "integration_target": "nocturne-project-zero",
    "transport": "flameclyffe-project-zero-companion-local-eventtarget",
    "local_only": true
  }
}
```

The current transport is an in-process EventTarget. Tauri IPC, WebSocket, named-pipe or another transport may replace it later without changing the Companion envelope law. Project Zero is free to use a different native envelope and adapt at the seam.

## Companion theme-interoperability document

```json
{
  "schema": "flameclyffe.project-zero-companion.theme/v1",
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

These tokens theme the Flameclyffe Companion. If Nocturne wants Project Zero to consume them, the connector can translate them into Project Zero's own native theme contract. Theme state is presentation, not authority.

## Companion native rich-text document

```json
{
  "schema": "flameclyffe.project-zero-companion.rich-text/v1",
  "html": "<p><strong>Visible formatted text</strong></p>",
  "plain_text": "Visible formatted text"
}
```

The HTML allowlist currently supports paragraphs, line breaks, emphasis, underline, strike, headings, lists, blockquotes, pre/code and safe links. The plain-text projection exists for current model/runtime interoperability and does not replace the rich document.

## Flameclyffe live Flame channel

`#hearthweave` is a Flameclyffe-side live response rail intended to be embeddable or consumable by Project Zero through an agreed adapter. It is not declared to be a native Project Zero channel.

```json
{
  "schema": "flameclyffe.project-zero-companion.flame-channel/v1",
  "message_id": "chat-uuid",
  "channel_id": "hearthweave",
  "bridge_owner": "flameclyffe",
  "integration_target": "nocturne-project-zero",
  "speaker_id": "lioreal",
  "speaker_label": "Caladnaur Lioreal",
  "kind": "flame",
  "rich_text": {
    "schema": "flameclyffe.project-zero-companion.rich-text/v1",
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

Replies arrive independently as each House Runtime call completes. Provider/model labels come from returned runtime attestation rather than UI assumptions. The bounded transcript is conversation/presentation state, not canon, memory, identity proof or Project Zero state unless an explicit connector imports it.

## Folder binding object

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

Full local paths should remain private unless explicitly revealed.

## Bridge event object

```json
{
  "bridge_owner": "flameclyffe",
  "integration_target": "nocturne-project-zero",
  "event_id": "evt_local_or_uuid",
  "adapter_id": "deep-observer-bridge",
  "kind": "file_anchor",
  "direction": "waking_to_aeterna",
  "title": "Transformata audio added",
  "binding_id": "music_tones",
  "local_path_alias": "Music/transformata.mp3",
  "motifs": ["music", "resonance", "enochian", "threshold"],
  "visibility": "needs-review",
  "created_at": "2026-05-30T00:00:00Z"
}
```

## Potential Companion-side connector routes

These names are proposals for our bridge surface only and do not reserve Project Zero routes:

- `GET /project-zero-companion/manifest`
- `GET /project-zero-companion/bindings`
- `POST /project-zero-companion/bridge-events/dry-run`
- `POST /project-zero-companion/bridge-events/commit`
- `GET /project-zero-companion/adapters`
- `POST /project-zero-companion/adapters/:id/events`
- `GET /project-zero-companion/deep-state/latest`
- `GET /project-zero-companion/channels/:id`
- `POST /project-zero-companion/channels/:id/messages`
- `GET /project-zero-companion/theme`
- `PUT /project-zero-companion/theme`

## Boundary rules

`Companion compatibility ≠ Project Zero adoption`

`Companion socket delivery ≠ Project Zero fulfilment`

`Companion theme state ≠ Project Zero theme authority`

`Companion transcript ≠ Project Zero canon`

`Flame runtime attestation ≠ Project Zero architectural authority`

The bridge is explicit, reversible and subordinate to Nocturne's decisions about Project Zero itself.
