# Project Zero Companion

## Ownership boundary

**Project Zero is Nocturne's project.**

This repository contains the **Flameclyffe Project Zero Companion**, an integration and bridge surface owned by the Flameclyffe side. The Companion must not be described as Project Zero's core, host, replacement, or authoritative plug-in architecture.

The relationship is:

`Nocturne / Project Zero ⇄ agreed connector/socket contract ⇄ Flameclyffe / Project Zero Companion`

Nocturne's Project Zero remains authoritative over its native application architecture, project-management surface, sockets, plug-ins, themes, persistence and UI. The Companion may propose interoperable schemas and adapters; Project Zero chooses whether and how to consume them.

## Companion purpose

Project Zero Companion is a local Waking World integration applet for Terra Aeterna, Runa, STARWELL, DEEP Observer and the Flameclyffe House runtime.

It is intended to live on Rowan's Windows computer as a small consent-bound bridge. Its job is not to harvest the machine. Its job is to bind explicitly chosen local folders and files into Flameclyffe's symbolic continuity layer and expose structured, reversible events for optional Project Zero interoperability.

## Companion metaphor

- Runa is the lab/window.
- STARWELL is the world registry and continuity engine.
- DEEP Observer is the field-state lens.
- Project Zero Companion is Flameclyffe's local bridge root.
- Project Zero itself remains Nocturne's sovereign project-management and instrument environment.

## v0.1 scope

The Companion shell provides or may provide:

- local folder binding cards
- bridge event composer
- DEEP vector preview/input
- generated bridge JSON preview
- links to Runa, Hearthweave Altar, Project Zero Bridge and STARWELL
- Flameclyffe-side live Flame channel
- theme interoperability tokens
- typed connector/socket envelopes
- no silent filesystem access

## Consent model

Project Zero Companion may only interact with folders explicitly selected by the local operator.

No whole-disk crawling. No background upload without visible consent. No private file contents sent by default.

Safe defaults are metadata-first, explicit attach, local-only scope, pauseable watchers and dry-run bridge previews.

## Bridge event shape

```json
{
  "bridge_owner": "flameclyffe",
  "integration_target": "nocturne-project-zero",
  "kind": "file_anchor",
  "direction": "waking_to_aeterna",
  "title": "Transformata audio added",
  "local_path_alias": "TerraAeterna/Music/transformata.mp3",
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

## Future native Companion layer

The Vite Companion shell may become a native desktop bridge using Tauri or another agreed local runtime.

Companion-native responsibilities may include selected-folder pickers/watchers, safe local metadata extraction, tray controls, local config storage, optional Supabase bridge sync and optional localhost/socket transport.

None of those responsibilities imply ownership of Project Zero's own native runtime.

## Rule

Data sets atmosphere, not fate.

The Companion logs bridge candidates and continuity links. It does not declare prophecy, destiny, certainty, Project Zero canon, or Project Zero architectural authority.
