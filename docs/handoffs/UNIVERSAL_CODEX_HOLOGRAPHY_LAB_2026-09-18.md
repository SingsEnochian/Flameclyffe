# Universal Codex Holography Lab

## Status

Prototype branch for the embodied Universal Codex animation layer.

The existing Magic Book remains the authoritative functional surface. This lab adds a projection layer above it without taking ownership of navigation, Glyph Studio state, receipts, Pencil input, or accessible DOM controls.

## What this prototype adds

- Three.js holographic projection geometry above the book;
- rotating magical-circle rings and a floating wireframe focus object;
- additive light panels with animated scanline/grid treatment;
- live ink sparks driven by existing `arcsweep:glyph-brush-sample` events;
- receipt pulses driven by existing `arcsweep:magic-book-receipt` events;
- user controls for holograms, ink aura, orbit motion, and projection intensity;
- persistent animation preferences in local storage;
- reduced-motion and WebGL fallback;
- no change to the current physical iPad/Pencil acceptance gate.

## Interaction law

The projection is an organ of the Book, not a replacement UI.

DOM remains authoritative for accessible interaction. Three.js may illuminate, project, animate, spatialise, and respond, but it does not silently own canon, navigation, drawing state, or receipts.

## Animation grammar

The first lab pass treats the Universal Codex as a magical animated grimoire:

- ink does not merely appear; it wakes light above the page;
- controls may read as projected spellwork rather than a conventional inspector;
- page changes produce local projection pulses;
- Glyph Forge movement can seed particles and later volumetric stroke echoes;
- holographic panels may become room doors, provenance leaves, Signal conversation objects, timelines, or Worldseed projections;
- transformation sequences should be state transitions with receipts, not ornamental cut-scenes disconnected from the OS.

## Reference projects

Public-project research identified useful mechanisms from:

- Three.js / React Three Fiber already present in Flameclyffe;
- Meta Immersive Web SDK for spatial/WebXR interaction patterns;
- `three-mesh-ui` for true 3D UI composition;
- `pmndrs/postprocessing` for bloom/scanline/glitch language;
- holographic-material examples for Fresnel/scanline/additive-light treatment;
- J.E.S.T.E.R as an interaction reference for hand tracking, pinch/grab, voice, WebSockets, and holographic scene control;
- Signal bridge projects (`signal-cli`, `signal-cli-rest-api`, TypeScript/Rust wrappers) for a future transport sidecar.

No third-party source code is copied into this prototype. Reference projects remain subject to their own licences.

## Signal boundary

Signal account state and cryptographic material stay outside the browser/Three.js layer.

Future path:

`signal-cli -> local/host sidecar -> normalised ArcSweep event -> Universal Codex projection`

The projection may receive message/thread/reaction/attachment/read-state events. It does not receive Signal private-key material.

## Kala Fierro reference ingest

**Kala Alexis Fierro** contributes transformation, stateful magical devices, command-response choreography, visible failure states, barriers/sealing, and diegetic receipts.

Reference ingest:

`apps/arcsweep/skills/sources/kala-fierro/kala-fierro-reference-ingest.v0.1.json`

Candidate Universal Codex sequence:

`intent -> explicit command -> acknowledgement -> gathering light/ink -> geometry construction -> materialisation/mode change -> active functional state -> receipt -> residual glow settles`

The animation follows the real state. Failed actions do not receive triumphant flourishes; successful actions leave an inspectable receipt.

## Circles reference ingest

**Circles** contributes presence, memory, dream, projection, and absence.

Reference ingest:

`apps/arcsweep/skills/sources/drive/circles-reference.v0.1.json`

Candidate Universal Codex presence machine:

`absent -> signal -> voice -> flicker -> coalescing -> stable projection -> fading -> absent`

Candidate scene classes:

`present | memory | dream | forecast | remote-presence | archived-witness`

Governing rule: **visual vividness never silently changes epistemic class.**

## The Rifts In the Night reference ingest

**The Rifts In the Night** contributes threshold, arrival, quarantine, and post-transition recovery grammar.

Reference ingest:

`apps/arcsweep/skills/sources/drive/the-rifts-in-the-night-reference.v0.1.json`

Candidate threshold machine:

`baseline -> signal drift -> tone/pulse change -> edge shimmer -> pressure build -> threshold crack -> coalescence -> stabilisation -> receipt/intake -> quiet recovery`

The key operational distinction is: **arrival and assessment are separate states.** The Codex may receive, preserve provenance, and stabilise an arrival before evaluating what it is.

## Praxeum Pad reference ingest

**Praxeum Pad** contributes branch-history, timeline divergence, rupture consequences, and the discipline of keeping uncertainty visible.

Reference ingest:

`apps/arcsweep/skills/sources/drive/praxeum-pad-reference.v0.1.json`

Candidate branch machine:

`baseline -> decision/event -> divergence marker -> parallel continuation -> consequence propagation -> reconciliation or continuing plurality`

Useful laws:

- approximate dates remain approximate;
- divergence ancestry remains visible;
- incomplete memory is not back-filled as recalled fact;
- an attempted repair is itself an event and may worsen the state;
- observers may disagree about an arrival without the system collapsing their disagreement.

This gives Time Room and Continuity Gate a visual language for branch ancestry rather than a single flattened timeline.

## Portents & Dreams reference ingest

**Portents & Dreams** contributes mutable dream environments, continuity threads, and relational anchors across radically changing projected scenes.

Reference ingest:

`apps/arcsweep/skills/sources/drive/portents-and-dreams-reference.v0.1.json`

Useful mechanics:

- backgrounds can morph continuously while participant identity stays anchored;
- a persistent ribbon/thread can show where someone has been and what remains connected;
- several world fragments can coexist in one dream-space without becoming one canon world;
- participant attention can drive scene changes instead of hard cuts;
- a stable relational anchor can persist while the environment changes around it.

Candidate visual grammar:

`stable participant + persistent thread + mutable scene field`

The scene remains `dream`; vividness does not promote it into present observation.

## Praxeum-Musebox reference ingest

**Praxeum-Musebox** contributes onboarding, adaptive teaching, sensory filtering, practice loops, and skill acquisition through reframing.

Reference ingest:

`apps/arcsweep/skills/sources/drive/praxeum-musebox-reference.v0.1.json`

Candidate learning machine:

`observe -> attempt -> detect friction -> change representation -> retry -> stabilise success -> record the working method`

Useful laws:

- do not interrogate an arrival before orientation;
- reduce noise and establish what is known before asking for explanation;
- repeated failure can mean the representation is wrong for the learner, not that the capability is absent;
- a failed attempt is a training receipt, not a verdict on capability;
- successful reframing should be preserved so the system can teach through the method that actually worked;
- sensory intensity should be locally attenuable without deleting the underlying signal.

This is directly useful for onboarding, accessibility, tutorial mode, the Skill Forge, and projected control intensity.

## Combined animation constitution

The current reference stack now teaches six different organs of the Codex:

- **Kala Fierro:** how a tool transforms and confirms state.
- **Circles:** how a presence appears, persists, and fades while preserving source class.
- **The Rifts In the Night:** how a threshold warns, opens, receives, and settles.
- **Praxeum Pad:** how timelines branch and retain ancestry.
- **Portents & Dreams:** how a projected world can morph while continuity remains legible.
- **Praxeum-Musebox:** how the Codex teaches, attenuates, retries, and records the method that worked.

Together:

`approach -> threshold cues -> arrival/coalescence -> source-class identification -> optional transformation -> active function -> adaptive interaction -> receipt -> quiet residual state`

Across all of them:

- animation must not outrun state;
- vividness must not outrun epistemic class;
- failure must remain inspectable;
- branch ancestry must remain visible;
- arrival must not be mistaken for assessment;
- learning should adapt representation before declaring inability.

A useful adjacent Drive source already located is *The Cyber Spellbook: Magick in the Virtual World*; it may receive its own reference ingest for digital-grimoire mechanics, but it remains a separate source.

## Next visual experiments

1. Project current ink strokes upward as fading 3D ribbons rather than only sparks.
2. Replace ordinary sliders with optional radial spell-control projections while retaining the underlying accessible controls.
3. Add page-specific projection profiles: Threshold, Glyph Forge, Receipts.
4. Add Kala-derived transformation choreography for opening a room, invoking a tool, merging views, quarantining a source, or entering Story Mode.
5. Add Circles-derived presence states for remote/archived/dream/memory projections.
6. Add Rift-derived threshold buildup so significant arrivals announce themselves before coalescence.
7. Add Praxeum Pad branch ribbons and divergence markers to Time Room / Continuity Gate.
8. Add Portents-derived world morphs with persistent continuity threads for Dream/Story Mode.
9. Add Musebox-derived adaptive tutorial states and local signal-intensity controls.
10. Turn successful action receipts into brief luminous numbered glyphs that can be opened back into the exact machine receipt.
11. Add gesture input only after desktop/touch controls remain fully usable.
12. Feed future Signal events into the same projection grammar as discrete, provenance-bearing objects.

## Seal

The Book remains usable when the magic is dark.

When the magic is lit, the machinery underneath is still true.
