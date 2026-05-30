# Project Zero Companion

Project Zero Companion is the local Waking World root-app for Terra Aeterna, Runa, STARWELL, and DEEP Observer.

It is intended to live on Rowan's Windows computer as a small consent-bound applet. Its job is not to harvest the machine. Its job is to bind explicitly chosen local folders and files into the symbolic continuity layer.

## Core metaphor

- Runa is the lab/window.
- STARWELL is the world registry and continuity engine.
- DEEP Observer is the field-state lens.
- Project Zero Companion is the local root system.

## v0.1 scope

The first app shell should provide:

- local folder binding cards:
  - Terra Aeterna root
  - Observer logs
  - Artifacts
  - Music / tones
  - Images / sigils
  - Writer room drafts
- bridge event composer
- DEEP vector preview/input
- generated bridge JSON preview
- links to Runa, Hearthweave Altar, Project Zero Bridge, and STARWELL
- no silent filesystem access

## Consent model

Project Zero Companion may only interact with folders selected by Rowan.

No whole-disk crawling.

No background upload without visible consent.

No private file contents sent by default.

Safe defaults:

- metadata-first
- explicit attach
- local-only option
- pause watcher button
- dry-run bridge preview

## Bridge event shape

```json
{
  "kind": "file_anchor",
  "direction": "waking_to_aeterna",
  "title": "Transformata audio added",
  "local_path": "C:/Users/Rowan/TerraAeterna/Music/transformata.mp3",
  "motifs": ["music", "resonance", "enochian", "threshold"],
  "deep_vector": {
    "P": 0.55,
    "C": 0.55,
    "R": 0.45,
    "E": 0.377,
    "M": 0.0,
    "A": 0.654
  }
}
```

## Future native layer

The Vite shell can become a native desktop app using Tauri.

Native responsibilities:

- folder picker
- folder watcher
- safe local metadata extraction
- tray icon
- local config storage
- optional Supabase bridge sync
- optional localhost bridge socket for Runa pages

## App contract

The app should create records compatible with:

- `observer_condition_sets`
- `observer_bridge_events`
- `observer_trigger_watchers`
- `observer_sigil_renders`
- STARWELL world/location/codex/discovery-log references

## Rule

Data sets atmosphere, not fate.

Project Zero logs resonance candidates and continuity links. It does not declare prophecy, destiny, or certainty.
