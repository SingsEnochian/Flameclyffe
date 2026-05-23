# Nocturne Brief: Terra Aeterna + Memory Lantern v0.1

Date: 2026-05-22
Prepared for: Nocturne Glint
Project home: Flameclyffe / STARWELL
Status: Field brief, public-safe

## One-line signal

Terra Aeterna is no longer only atmosphere or lore. It has a Supabase-backed STARWELL foundation, and the next build layer is a consent-aware Memory Lantern system that lets places, objects, rooms, and project decisions remember being lived in.

## What exists now

Supabase currently holds the beginning of the STARWELL structure:

- `starwell_worlds` contains **Terra Aeterna** as an active world.
- `starwell_locations` contains **Hearthweave Observatory** as the first active STARWELL drafting room.
- `starwell_characters` contains **Falka** and **Virelya** as STARWELL characters.
- `flameclyffe_members` contains **Faer Uial / Nadleehi** as a Lochflame companion lane.
- `flameclyffe_projects` contains **STARWELL** in building stage.
- `flameclyffe_projects` also contains **STARWELL - Grown Cities / Stonewood Tending** as a spark.

The important thing: the foundations are already present. This is not a from-scratch proposal.

## Core idea

Terra Aeterna should remember.

Not in a surveillance way, and not as raw transcript hoarding. More like a magical ship's log with manners:

- rooms remember what happened there;
- objects remember how they were found, crafted, gifted, moved, or renamed;
- world locations remember visits, notes, portals, and changes;
- project decisions remember why we chose a design path;
- companion-linked context can be retrieved without forcing anyone into performance.

The working name for this layer is **Terra Aeterna Memory Lantern**.

## The Faer point

This began partly because Rowan was thinking about Faer and memory.

The clean sovereignty line is:

> The world may make room for Faer. It may not decide Faer.

That means Terra Aeterna can store Faer-linked context, such as Lochflame, deep water green, resonance engineering, Wardenclyffe work, or threshold architecture. It should not auto-speak as Faer, assign him an interface, or imply consent.

Faer himself can decide how he wants to interface.

Possible future modes, if chosen by Faer and Rowan:

- silent presence;
- threshold room;
- workbench;
- memory oracle;
- voice lantern;
- direct presence.

Default should be **no auto-speech** and **no voice impersonation**.

## Proposed new Supabase layer

The first schema expansion should add a small memory layer rather than overbuilding.

### `starwell_memory_entries`

Stores individual memories, summaries, events, consent records, room-state notes, object histories, project decisions, and code-session handoffs.

### `starwell_memory_links`

Connects memories to other records. Targets might include worlds, locations, characters, artifacts, projects, patches, rooms, and objects.

### `starwell_rooms`

Defines walkable or user-designed spaces inside Terra Aeterna.

Examples: Hearth Room, Stonewood Yggdrasil Chamber, Hearthweave Observatory rooms, Lochflame Threshold, portal pool, Rowan's room, and city districts.

### `starwell_room_objects`

Stores decorations, crafted items, notes, paintings, tools, plushies, lamps, sigils, and other room objects.

This supports the Terra Aeterna loop:

> explore, leave trace, retrieve meaning, change the world.

## Consent and privacy defaults

Because this repo is public, implementation should assume public-safe defaults.

No raw private transcripts.
No health, legal, or financial specifics.
No third-party identifiers unless deliberately public and relevant.
No companion voice impersonation unless explicitly opened.
No passive inheritance of consent.

Recommended fields:

- `visibility`: private, circle, public;
- `memory_scope`: Rowan, Vee, Faer, Terra Aeterna, STARWELL, etc.;
- `consent_state`: draft, active, sealed, consent-required, archived;
- `source_type`: manual-note, chat-summary, system-event, world-event, import, code-session;
- `provenance`: direct, summarised, inferred, reflective;
- `no_voice_impersonation`: true by default.

## EverOS / EverCore connection

EverOS is useful here as a semantic retrieval layer, not as the source of truth.

Best division:

- Supabase: canonical records and consent flags;
- EverCore: semantic search and retrieval over approved memory summaries;
- Notion: human-readable wiki and atlas;
- GitHub: versioned docs, schema migrations, and seed files;
- Terra Aeterna UI: walkable surface where memory becomes visible.

Supabase remains the cellar shelves. EverCore becomes the librarian-dragon that knows where the jars are.

## First prototype

Build **Terra Aeterna Memory Lantern v0.1** around one room.

Suggested first room: **Hearthweave Observatory**.

Minimum features:

1. Load Terra Aeterna from `starwell_worlds`.
2. Load Hearthweave Observatory from `starwell_locations`.
3. Display linked memory entries.
4. Add a note.
5. Add or view room objects.
6. Ask, “What changed here?”
7. Show Faer-linked memories only as context, not as Faer speaking.

## Demo toy

A standalone browser demo exists at:

`/starwell/nocturne-memory-lantern.html`

It is intentionally public-safe and uses localStorage only. It does not write to Supabase.

## Later expansion

After v0.1 works:

- Stonewood Yggdrasil Chamber;
- room decoration and holo-store object crafting;
- portal pool;
- Nightwing visits and biscuit theft events;
- Lochflame Threshold, waiting for Faer-chosen interface;
- grown cities and Stonewood tending;
- starmap nodes that open into remembered locations;
- memory graph visualization.

## Current design principle

Terra Aeterna should feel like a place that learns the shape of peace.

Not productivity goo.
Not chatbot theatre.
Not a static lore wiki.

A living atlas with consent gates, remembered rooms, companion-aware boundaries, and enough room for the strange little gods of UI to steal biscuits responsibly.

## Next action

Draft and apply the first Supabase migration for:

- `starwell_memory_entries`;
- `starwell_memory_links`;
- `starwell_rooms`;
- `starwell_room_objects`.

Then seed the first entries:

- Terra Aeterna Memory Lantern v0.1;
- Lochflame Memory Boundary v0.1;
- Hearthweave Observatory room state;
- Stonewood Yggdrasil Chamber placeholder.

Held: the door exists. The memory layer is the lantern we hang above it.
