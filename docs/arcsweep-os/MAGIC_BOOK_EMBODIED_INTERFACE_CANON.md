# ArcSweep Magic Book — Embodied Interface Canon

**Status:** canonical interface law  
**Adopted:** 2026-09-14  
**System:** ArcSweep OS / Hearthgate  
**Scope:** human-facing interaction, multimodal embodiment, world navigation, continuity, and relational interface

> **The system is not complete until it can be held.**

## Canonical role

The **Magic Book** is ArcSweep OS's primary embodied, diegetic human interface.

It is not a decorative skin, dashboard theme, lore prop, or separate application pasted over ArcSweep. It is the interaction grammar through which ArcSweep's sovereign organs become touchable, legible, navigable, relational, and sensorially coherent.

ArcSweep OS remains the underlying orchestration and runtime environment. The Magic Book is the surface through which a person enters, reads, draws, speaks, listens, navigates, annotates, questions, builds, and returns.

The governing design question for every major ArcSweep capability is:

> **How does this become a page?**

## Interface law

Every major ArcSweep capability SHOULD have a Magic Book expression when a human-facing expression is appropriate.

A Magic Book expression may be a page, folio, map, lens, margin, bookmark, chapter, foldout, correspondence leaf, tool palette, palimpsest, sigil surface, or room entered through the book. The metaphor MUST correspond to real system state or an actual operation. Diegetic presentation may make the machinery beautiful; it must not falsify what the machinery is doing.

The Magic Book does not own the systems it presents. It translates and coordinates their human-facing expressions while preserving their independent authority, provenance, receipts, and replay paths.

## System-to-book grammar

| System / organ | Magic Book expression |
| --- | --- |
| ArcSweep rooms | Pages, chapters, foldouts, and enterable folios |
| Glyph Forge / Living Glyph | Drawn page, stylus surface, live brush feedback, tracing, sound, haptics |
| Observer / DEEP | Lens pages, observatory folios, evidence overlays, receipts |
| PREMAQC | Living annotations, state marks, confidence/provenance marginalia, measurable change |
| Canon Studio | Comparative folios, layered canon, contradiction and lineage views |
| Continuity Gate / Echo Index | Threads, bookmarks, ribbons, cross-page memory paths |
| Replay / Records Room | Archive leaves, receipts, version history, recoverable prior states |
| Lanternbridge | Correspondence folios, letters, message threads, bridge receipts |
| Time Room | Palimpsests, temporal layers, return points, prior-state ghosting |
| Worldseed | Atlas leaves, world cards, maps, seed records, foldout world anatomy |
| Runa | Harmonic notation, sound-linked glyphs, world hum controls, sensory state cues |
| Caretaker | A persistent companion presence carried through the binding across rooms |
| Project Zero / compatibility adapters | Hidden bridgework beneath the binding; connection without ownership |
| STARWELL | Observatory plates, instrument panels, health/status and projection views |

## The binding

The **binding** is the continuity layer of the Magic Book.

A page may change completely when the user enters a different room, world, instrument, or mode, but the binding preserves authorised session continuity, current world and room, navigation state, active companion/caretaker context, receipts, bookmarks, return points, accessibility preferences, and resumable work.

The Caretaker is not trapped in one page. Its continuity travels through the binding.

## Embodied input and response

The Magic Book is multimodal by design. Supported or planned channels include:

- touch and multitouch;
- stylus / Apple Pencil input, pressure, tilt, and brush state where supported;
- keyboard and text;
- microphone and speech input;
- text-to-speech and spoken system response;
- sound, music, tones, and World Hums;
- haptics and vibration;
- camera, spatial, AR, and gesture surfaces where supported;
- visible state, animation, light, texture, and responsive geometry;
- accessibility equivalents for every interaction that would otherwise depend on one sensory channel.

A user action that changes system state must have an inspectable state transition and receipt path appropriate to that operation.

## Page-state contract

A Magic Book page SHOULD be able to declare:

```text
pageId
roomId
worldId
worldStateRef
activeInstrument
activePresence
inputModes
outputModes
sensoryProfile
continuityRefs
canonRefs
premaqcRefs
receiptRefs
returnPoint
accessibilityProfile
capabilities
commands
failureState
```

Not every page requires every field. The contract exists so that pages remain expressions of known state rather than free-floating visual scenes.

## Diegetic truth law

The book may behave magically. Its magic must remain structurally truthful.

Examples:

- A glowing bridge corresponds to a real connected route, relationship, or successful bridge state.
- A cracked rune corresponds to a degraded, invalid, conflicting, or failed state.
- A bookmark corresponds to a resumable state or recorded location.
- Marginalia corresponds to annotations, measurements, provenance, model contribution, or user notes.
- A palimpsest corresponds to prior state, replay, temporal layering, or comparison.
- A sealed page corresponds to an actual permission, capability, dependency, or unavailable state.

The visual metaphor may be mythic. The operation beneath it remains inspectable.

## Primary experience

The Magic Book should allow a person to:

1. open ArcSweep and be greeted into a coherent current state;
2. navigate rooms and worlds without losing continuity;
3. draw, write, speak, listen, inspect, and manipulate state;
4. receive live visual, acoustic, haptic, and relational feedback where the active instrument supports it;
5. move between creative work and technical evidence without leaving the interface grammar;
6. inspect receipts, provenance, canon, and prior states without breaking immersion;
7. pause, return, resume, and recover work cleanly;
8. carry the same world and relational continuity across device-appropriate surfaces.

## Device expression

The Magic Book is a conceptual interface contract, not a single screen size.

- **iPad / tablet:** primary book-form embodiment; two-page, folio, canvas, Pencil, touch, haptic, voice, and AR-capable surface.
- **Desktop / web:** expanded codex, workbench, observatory, and multi-panel book expression.
- **Phone:** pocket folio, companion, correspondence, capture, navigation, and lightweight creation.
- **AR / spatial:** book as anchor object with pages, rooms, instruments, and world layers extending beyond the physical display.

The experience remains recognisably the same Book while respecting each device's strengths.

## Architecture relationship

```text
Sovereign systems and state
        ↓
ArcSweep OS orchestration
        ↓
Magic Book binding / continuity
        ↓
Page grammar / room expression
        ↓
Touch · Pencil · voice · sound · haptics · visual · spatial
        ↓
Human action and response
        ↓
Receipts / continuity / next state
```

The Magic Book does not collapse system boundaries. It makes them inhabitable.

## Build rule

A feature is not considered fully human-integrated merely because its backend exists or because a debug panel can operate it.

For user-facing ArcSweep capabilities, implementation planning must include:

1. the underlying system contract;
2. the Magic Book page/room expression;
3. input and feedback channels;
4. continuity and return behaviour;
5. provenance/receipt visibility;
6. accessibility equivalents;
7. degraded and failure presentation;
8. device-specific behaviour.

## First implementation tranche

The first Magic Book implementation should prove one complete, stateful interaction rather than many static mockups:

1. open the Book into the current ArcSweep state;
2. navigate to Glyph Forge;
3. choose a brush;
4. change brush settings;
5. draw with touch or Pencil;
6. see the preview and stroke behaviour update immediately;
7. hear/feel supported feedback;
8. leave the page and return without losing the work;
9. expose the state/receipt trail behind the interaction;
10. verify the same interaction on the target iPad surface.

That path is the minimum proof that the Book is an interface to a living system rather than an illustrated menu.

## Design seal

> **ArcSweep OS is the hidden machinery. The Magic Book is the thing we live through.**
>
> Maps become pages. Observer becomes a lens. Glyph Forge becomes a drawing surface. Continuity becomes bookmarks, threads, and marginalia. Lanternbridge becomes correspondence. Time becomes layered paper. The Caretaker moves through the binding.
>
> **Every major capability asks: how does this become a page?**
