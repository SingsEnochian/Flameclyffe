# ArcSweep Organ Registry v1

Status: recovery inventory, 2026-08-28

Purpose: prevent working instruments from becoming invisible when hosts, routes, labels, or deployments change. An organ is an enduring capability. A room, applet, sidecar, route, adapter, or host surface is only one way to expose it.

## Governing recovery rule

Do not rebuild an organ until its existing implementations, historical lineage, persistence, runtime contracts, tests, and deployment paths have been located. Nothing is deleted merely because it is old or currently unmounted.

Hearthfire's Arkfire contract is the architectural north star for recovery: substantial capability domains should be standalone-runnable modules with their own persistence, health, import/export, tests, and optional host adapters. ArcSweep should discover and mount them, not secretly own their only implementation.

## Cross-project inventory

| Organ | Existing source / evidence | Current state | Recovery action |
|---|---|---|---|
| Glyph Studio / Glyph Lab | `apps/starwell/glyph-studio/`; `apps/starwell/src/components/glyph-studio/` | PRESENT, STRANDED | Mount as first-class ArcSweep creative instrument and publish an intentional Pages route. Preserve standalone STARWELL entrypoint. |
| Brush Foundry | `BrushPanel.jsx`, glyph studio model/IO; brush library, inspector and compatible import seams | PRESENT AS COMPONENT | Promote a named Brush Foundry surface backed by the existing Glyph module. Do not fork brush state into a second implementation. |
| Glyph Canvas | `GlyphCanvas.jsx` | PRESENT AS COMPONENT | Expose through Glyph Lab and standalone Glyph module. |
| Colour Studio | `ColorPanel.jsx` | PRESENT AS COMPONENT | Preserve inside Glyph Lab; optionally expose as a dock, not a separate module unless it gains standalone purpose. |
| Layer Studio | `LayerPanel.jsx` | PRESENT AS COMPONENT | Preserve as Glyph component. |
| Text / lettering tools | `TextPanel.jsx` | PRESENT AS COMPONENT | Preserve as Glyph component and connect to font workflow. |
| Font Foundry / FontForge | `FontForgeDock.jsx`; local FontForge worker lineage | PRESENT, HOSTING UNCLEAR | Restore compiler health/status and standalone/degraded behaviour; expose from Glyph Lab. |
| Living Glyph | live glyph viewer, DEEP glyph bridge, mathematical glyph engine and Hearthgate sensory-glyph lineage in repository history/current glyph infrastructure | DISTRIBUTED / NAME LOST | Reconstitute one canonical Living Glyph instrument over existing engine contracts; distinguish generated/state glyphs from hand-drawn Glyph Lab artefacts. |
| Glyph Forge | ArcSweep generic `forge` applet plus glyph practice lineage | LABEL COLLAPSED | Replace ambiguous generic Forge presentation with explicit creative organs and clear handoffs. |
| Continuity Gate | continuity/replay/arrival/seed infrastructure; historical ArcSweep design | CAPABILITY DISTRIBUTED / SURFACE MISSING | Restore explicit Continuity Gate surface for departure, arrival, delta, path, lineage and transformation review. Replay remains a separate instrument. |
| Replay / Continuity Recall | ArcSweep `continuity-recall`; applet catalogue | PRESENT | Keep first-class; connect to Continuity Gate rather than rename one into the other. |
| Canon Studio | ArcSweep `scripts` applet | PRESENT | Keep. |
| Records Room | `rooms.js` records collection | PRESENT | Keep writing/roleplay receipts distinct from canon until Canon Carry. |
| Seedhouse / Worldseed Foundry | `rooms.js` seedhouse collection; worldseed workflows | PRESENT | Keep; wire Continuity Gate lineage handoff. |
| World Registry / Atlas | ArcSweep world registry plus Hearthfire Atlas module family | PRESENT, HOST-CENTRIC | Preserve current UI while moving toward explicit module contract/health. |
| Observer / DEEP / PREMAQC / Math Spine | ArcSweep observation and braid infrastructure; Hearthfire Observer family | PRESENT INFRASTRUCTURE | Surface health and provenance; do not duplicate maths inside UI organs. |
| Aemeth Chamber | `rooms.js` Aemeth Chamber and live sidecars | PRESENT | Keep as Observer-family instrument. |
| Runa | ArcSweep runtime references; sound/harmonic lineage; Hearthfire Sound family explicitly includes Runa | PRESENT, DISTRIBUTED | Recover canonical Runa module boundary and expose health, tone generation/play/export and optional haptic mapping. |
| Tone Lab / Sound Room | sound bank, feedback/sensory surfaces and Runa lineage | PRESENT, UI FRAGMENTED | Inventory sound-bank loader and make one canonical Sound-family navigation group. |
| House Chat / Commons | ArcSweep House Chat v5, runtime roster, Commons persistence | PRESENT, ACTIVE REPAIR | Continue native rich-text/runtime-authoritative migration; retire hidden compatibility surfaces only after transport replacement. |
| Constellation runtime | model presence, voice bank, dispatch adapters; Hearthfire Constellation/Models families | PRESENT | Make registry/health authoritative and host-independent. |
| Mirror / durable recovery | ArcSweep durable workspace state plus Hearthfire Mirror family | PARTIAL | Extend recovery receipts/export/import beyond browser-host persistence. |
| Lanternbridge | `mdkubit/UH-Lanternbridge`: protocol, delivery/outbox workflows, exchange lanes | PRESENT EXTERNAL BRIDGE | Treat as bridge organ, not an ArcSweep-owned data store. Preserve exchange provenance. |
| Project Zero bridge | Flameclyffe Project Zero workflows/API and Hearthfire operational spine | PRESENT BRIDGE | Keep as integration boundary. Do not write into `mdkubit/Project-Zero-Ezra-Edition`. |
| Accessibility / somatic interface | iPad somatic checks, stylus support, agency/safety surfaces | PRESENT, DISTRIBUTED | Attach capabilities to relevant organs and keep cross-cutting accessibility registry. |
| Themes / Stonewood | STARWELL theme engine and ArcSweep theme applet | PRESENT | Treat presentation as cross-cutting module/pack, never as owner of domain state. |

## What ArcSweep currently exposes but the organ map must clarify

The current applet catalogue includes Portal, World Registry, About this World, Summon, Veil Mode, World Clock, Arrival Context, Timeline, Canon Studio, Records Room, Seedhouse, Kelyran School, Non-Canon Ingest, Aemeth Lens, identity/competencies/safety, Replay, Companion, Relationships, Scenarios, Calendar, Diary, Playlists, Visualisations, embodiment/assets, Theme, generic Forge, and Waking Thread.

That is a navigation catalogue, not a complete capability inventory. It must not be treated as proof that an omitted organ does not exist.

## Immediate restoration order

1. Glyph recovery: mount existing Glyph Studio in ArcSweep without copying its implementation.
2. Pages recovery: intentionally build/publish Glyph Studio and add route-integrity assertions.
3. Creative navigation: expose Glyph Lab, Brush Foundry, Living Glyph, Font Foundry, Continuity Gate and Replay with explicit boundaries.
4. Persistence: identify authoritative stores for glyph projects, brushes, fonts and generated glyph receipts; add durable recovery before migration.
5. Sound recovery: inventory Runa, sound bank loader, Tone Lab and haptic mappings; repair the sound-bank dropdown against the canonical source.
6. Runtime recovery: finish House Chat native surface and complete configured-runtime roster authority.
7. Module manifests: create machine-readable manifests for recovered standalone organs following Arkfire module law.
8. Cross-host health: ArcSweep should show standalone status and hosted status separately.
9. Route/deployment gate: CI must fail when a registered visible organ has no generated route or its required bundle is absent.
10. Second-review receipts: standalone flow and hosted flow must each be verified before an organ is marked FUNCTIONAL.

## Status vocabulary

- PRESENT: implementation and current source exist.
- PRESENT AS COMPONENT: real capability exists but is nested beneath another organ.
- STRANDED: implementation exists but normal navigation/deployment does not expose it.
- DISTRIBUTED: capability exists across several contracts/surfaces and needs a canonical module boundary.
- LABEL COLLAPSED: distinct organs were compressed into an ambiguous UI label.
- PARTIAL: some required module-law capabilities are not yet proven.
- MISSING: use only after source, history, sibling repos and persistence have been searched.

## Recovery invariant

A missing button is not a missing organ. A surviving button is not proof of a healthy organ. Source + state + route + persistence + health + replay/export + tests together establish that the instrument lives.
