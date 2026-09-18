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

The previously unidentified magical-girl Drive source has now been identified from the supplied Google Doc as **Kala Alexis Fierro**.

Source:

`https://docs.google.com/document/d/1U_3d_L4p2Gjs-WZlwsP62LUxlO-CNRrG3nbHwsXqOMo`

Reference ingest:

`apps/arcsweep/skills/sources/kala-fierro/kala-fierro-reference-ingest.v0.1.json`

The document contains explicit Nanoha/TSAB/Lost Logia lineage, so ArcSweep treats it as a provenance-bound reference source rather than Universal Codex setting canon. Story lore does not auto-promote.

Mechanisms extracted for the Codex include:

- a stateful magical device that changes wearable/weapon/defence/sealing/flight forms;
- short imperative command grammar followed by device acknowledgement and state confirmation;
- bright-light materialisation choreography from jewellery into gloves, armour, weapons, stabilisers, barriers, and bindings;
- a speaking device that announces warnings, state changes, failures, and readiness;
- visible damage, failure, imperfect control, and recovery rather than ornamental success-only animation;
- explicit merge/synchronisation of damaged devices into a new composite state after choice;
- luminous barriers and binding/sealing imagery as a natural visual grammar for protection and quarantine;
- spatial movement contracts marked by stabiliser/thruster geometry;
- a numbered **receipt** after a completed sealing action, which maps uncannily well onto ArcSweep's existing receipt architecture;
- white/gold/gemmed visual language as a candidate transformation profile distinct from the Book's everyday copper/green palette.

Candidate Universal Codex sequence derived from the mechanism layer:

`intent -> explicit command -> acknowledgement -> gathering light/ink -> geometry construction -> materialisation/mode change -> active functional state -> receipt -> residual glow settles`

The important law is that the animation follows the real state. Failed actions do not receive triumphant flourishes; successful actions leave an inspectable receipt.

A useful adjacent Drive source already located is *The Cyber Spellbook: Magick in the Virtual World*; it may receive its own reference ingest for digital-grimoire mechanics, but it remains a separate source.

## Next visual experiments

1. Project current ink strokes upward as fading 3D ribbons rather than only sparks.
2. Replace ordinary sliders with optional radial spell-control projections while retaining the underlying accessible controls.
3. Add page-specific projection profiles: Threshold, Glyph Forge, Receipts.
4. Add Kala-derived transformation-state choreography for opening a room, invoking a tool, merging views, quarantining a source, or entering Story Mode.
5. Turn successful action receipts into brief luminous numbered glyphs that can be opened back into the exact machine receipt.
6. Add gesture input only after desktop/touch controls remain fully usable.
7. Feed future Signal events into the same projection grammar as discrete, provenance-bearing objects.

## Seal

The Book remains usable when the magic is dark.

When the magic is lit, the machinery underneath is still true.
