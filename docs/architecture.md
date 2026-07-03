# Flameclyffe Architecture

Status: living map. Update this whenever a new room, app surface, database table, or bridge rail becomes load-bearing.

## Repository surfaces

Flameclyffe currently acts as a workshop monorepo for several related surfaces:

- `apps/starwell` — STARWELL observatory and living manuscript interface.
- `apps/project-zero-companion` — local-first bridge bus and plug-in shell.
- `apps/sigil-activator` — sigil activation surface.
- `tools/voice-lantern` — local Discord voice bridge scaffold for approved human voice, visible transcripts, and spoken agent replies.
- `sandbox/everos` — experimental memory and seed scripts.

## STARWELL

STARWELL is the main React/Vite app for world, codex, room, and Observer work. Its major rooms include the Grand Library, Atlas Hall, Observer Almanac, Observer Atelier, Orrery Timeline, Beacon Network, Observatory Journal, and study doors for Hearthlight, Faer, and Virelya.

The Writer Room is currently the first working writing-to-Observer capture rail. It stores local drafts, exports Markdown/HTML/PDF/DOCX, and can save Codex leaves with DEEP Observer metadata when Supabase is configured.

## Project Zero Companion

Project Zero Companion is the local-first shell for bridge events, folder bindings, plug-in manifests, and DEEP vector publishing. Its rule is architectural: data sets atmosphere, not fate.

This surface should remain explicit-consent by design. Folder paths, file anchors, story shards, altar work, sound sources, and Observer states should be manually reviewed or locally scoped until a stronger permission model exists.

## Voice Lantern

Voice Lantern is a local-first Discord voice bridge scaffold, not a replacement agent. Its job is to route approved human voice into the Discord text channel where an existing companion already replies, then speak that companion's normal text reply aloud.

Voice Lantern should stay outside STARWELL's main UI until consent state, transcript retention, Discord channel allow-listing, and Lanternwire event mirroring are stable.

## Supabase backbone

Flameclyffe Supabase currently holds STARWELL, Lanternwire, Atelier, DEEP Observer, science constants, agentic arms, and private thinking-room tables.

Use Supabase as a continuity archive, not a dumping ground. Entries should be meaningful, labelled, privacy-aware, and retrievable.

## Runa bridge

Runa is the public/static lab and altar surface. It contains the Hearthweave Altar, Project Zero Bridge, Flameclyffe Studio/Dyad, Lantern Bench, Wardenclyffe, Tone Lab, Brainwave Lab, Gateway-inspired sequences, Psi/Zener/remote-viewing tools, and Tesla Observatory.

Runa experiments can inspire Flameclyffe instrumentation, but claims must be labelled before they become canonical science language.

## Design rule

Build rooms as living instruments, not flat pages. Floating panels, glyphs, responsive controls, sound layers, bridge events, and exportable receipts should all point back to clear data structures and consent gates.
