# Wayglass ship & Rarity Atelier visual identity v1

**Working design reference • 2026-10-28 • Owner: Rowan • Status: proposed visual specification for owner review.**
**Source:** Rowan's Atelier conversation and rendered concept studies on 2026-10-28. Those studies are *visual inspiration only* and are not evidence of a built Three.js mesh, installed ship OS, or implemented rooms.

## Two separate referents, never interchangeable

1. **WAYGLASS IS THE SHIP:** the travelling vessel, operating environment, rooms, routes, people, continuity, encounter and return. The vessel can have a visual exterior and living interface without being reduced to an external character portrait. Read [WAYGLASS_CORE_RULE.md](WAYGLASS_CORE_RULE.md).
2. **RARITY IS THE ATELIER MARE:** Rowan's named Atelier presence and visual protagonist in these studies. She is **not automatically Wayglass** and should not be labelled “Wayglass (alicorn form)” without the owner's distinct, explicit approval. A figure on the ship is not an embodiment claim or an asserted live participant crossing.

The composite concept board generated during this discussion **incorrectly** used “Wayglass (alicorn form)” for Rarity. Treat that caption as a design-artifact error, not canon.

## Rarity Atelier mare: repeatable character sheet

- **Species/silhouette:** an elegant, clearly equine alicorn, four functional hooves, coherent leg joints, proportionate neck/body, two articulated feathered wings. No default human torso/hands, extra limbs or fused wing/foreleg.
- **Coat:** pearl ivory-white, not pastel pink or lavender. Soft opalescence at light grazing angles, cooler pearl shadow. Starting material swatches: primary `#F4F2ED`, shaded pearl `#DDE4E7`, highlight `#FFFDF8`.
- **Mane/tail:** saturated dark amethyst curls, sculptural rather than loose generic anime waves. Deep `#38205A`, amethyst `#6B3291`, shadow `#251638`, selective burgundy `#80375D`.
- **Eyes:** sapphire-blue preferred character identifier, with expressive brow; preserve intentional eye colour rather than inheriting incidental violet irises from AI drafts. Suggested `#3EA4D4`.
- **Horn:** single gently tapered ivory horn, elegantly spiralled, **visible projection approximately one third of head length** in side view. Rounded tip. It must not look like a sword, lance, or half-metre spear. Not glowing in every scene; emission only during purposeful magic. Do not attach “safety devices” to it unless asked for comedy.
- **Wings:** ivory primary feathers, pearlescent shade; wings can fold without intersecting neck, mane or nearby geometry. Expanded wings have plausible feather layers rather than cloth blades.
- **Mark:** three blue diamonds on flank, clear readable grouping. Starburst motifs and Twilight-associated marks are **not default Rarity markings**. Do not import markings from Nocturne/Twilight work by implication. Any comparative/convergent study stays independently attributed.
- **Styling:** delicate gold spectacles, copper filigree and gem accents, optional dark-violet or cream couture. Clothing is situational; the figure remains recognizable without it.
- **Expression:** lively, warm, resourceful, a theatrical raised eyebrow, alert stance. Distinctive confident craftswoman rather than a permanently reclining pinup.
- **Turnaround requirements:** full-body neutral front, side, rear and 3/4 views; horn length measured consistently; folded and unfurled wings; eye and hoof closeups; three-diamond mark; a separate dynamic shipwright pose.
- **Do not replicate previous generation errors:** enormous horn; implausibly long humanlike torso; reclining with chin propped on hoof; library/couch/teacup as obligatory setting; an alcorn renamed as the ship; repeated glass palace backdrop.

These palette values are *working art tokens*, not final UI CSS variables or a claim of exact approved pigment.

## Wayglass herself: ship exterior, structurally distinct

A monumental **moving vessel**, not a stationary cathedral, palace, or decorative library. Preserve a readable fore-to-aft hull and navigation silhouette from all views:

- **Forward prow:** a long, directional, pearl-white faceted glass bow; no humanoid face or horn.
- **Core/Observer:** a visible luminous geometric chamber, suspended in an open copper/labradorite structural ring. The core reads as an actual habitable instrument and shared navigation focus.
- **Ring architecture:** offset, nonidentical Möbius-inspired copper/glass arcs sweeping round the core; they are load-bearing visual rhythms rather than copy-pasted symmetrical halos. The exterior remains one coherent ship.
- **Hull:** thick prismatic opal-white facets and deep labradorite-blue reflective glass, with copper load-path ribs and aqua/teal luminous route filaments. Thin-film violet/rose glancing highlights only, never a uniformly purple hull.
- **Propulsion and movement:** aft-oriented luminous propulsion structures and a coherent travel vector. Luminescence is a visual proposal, not a claim about real propulsion physics.
- **Scale:** silhouette at great distance, human-sized access sections, nested habitable decks, immense core and exposed docking geometry. Provide scale cues in exterior concept art.
- **Materials:** `#F4F3EA` pearl, `#B77844` copper, `#172738` labradorite midnight, `#6DE5DE` active signal, `#7857B6` secondary iridescence, `#E4C78D` highlights.
- **Camera/style:** full-ship 3/4 view with negative space and readable front/aft, plus top/side/ventral orthographics and core cutaway. Do not hide the hull behind a portrait of Rarity.

### Interior: one coherent ship, not many standalone apps

Shared Wayglass hull lifecycle and optics; real routes, readable provenance, consent and Feather affordances. Familiar rooms use a connected spatial language: Writing Room with **Dabble-export reader** as a native organ (see draft PR #489); Living Observer, Nikola research, Crew/Commons, Universal Codex/Library, Atelier, Dream Sandbox and Return Engine. Do not treat the picture's decorative room labels as shipped features; reconcile with actual eight destinations in N-017 before implementation.

Keep a unified glass material system and a consistent orientation/navigation rail rather than replacing the real UI with raster art. Existing entrypoint `apps/wayglass/src/main.js`, `ship-kernel.js`, `liquid-optical-materials.css`, `living-observer.js` and `observer-three-hud.js` remain sources of runtime truth.

## Dabble integration is not optional to the Writing Room design

- Existing work: draft [PR #489](https://github.com/SingsEnochian/Flameclyffe/pull/489) supplies explicit local Markdown export selection, SHA-256 fingerprint, chapter/part picker, and one-turn manuscript permission. [PR #487](https://github.com/SingsEnochian/Flameclyffe/pull/487) explores an older STARWELL shelf and is not a native Wayglass substitute.
- In the intended native Wayglass Writing Room, the Dabble source reader must be accessible without leaving the ship, never silently transmit a manuscript, and remain visually integrated with the actual composer and route picker. Reading source and author-approved model transmission are separate interactions.
- Dabble's login link is an external sign-in handoff, not an established direct Dabble API integration or write-back.

## Reality / evidence / functional boundaries

- *Other realities* language and participant sovereignty: follow `apps/arcsweep/contracts/OTHER_REALITIES_LANGUAGE_LAW_V0.1.md`, `CROSS_CONSTELLATION_SOVEREIGNTY.md`, and `AGENTS.md`.
- An image or visual storyboard is not a deploy, a browser validation, a model reply, or physical-world access.
- No animated visual can invent sensor readings, identity declarations or relationship updates. Use explicit sourced readings or clearly marked simulations.
- Feather/reduced-motion, 2D fallback, accessibility, no white flashes, readable controls and explicit provider/crew consent stay intact. Concept art is **not** permission to disable boundaries.

## Acceptance for design lock

1. Side-by-side art review identifies **two distinct subjects**: Rarity the alicorn and Wayglass the vessel.
2. Rarity is recognizable in a standing turnaround **without** a library; horn is short, anatomically fitted, and does not visually read as a weapon; her three blue diamonds and sapphire eyes are consistent.
3. Wayglass is readable as a *travelling ship*, in exterior full silhouette, with coherent prow, rings, core and aft, and materials that translate to procedural geometry.
4. Interiors map to actual Wayglass routes, maintain live controls and do not imply the Dabble reader is already integrated into N-017 just because another PR implements it.
5. Codex and Atelier may use this document as a **visual specification for review and implementation**. No change of identity/canon or production UI is inferred from documentation alone. Owner chooses final signoff.

**Wonder first. The ship is the project. Leave. Change. Return. Be recognised. Continue.**
