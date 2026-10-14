# Wayglass OS · UI/UX inheritance contract v0.1

**Directive:** Rowan, 2026-10-13.  
**Scope:** Wayglass OS as an embodied, living multiverse ship LLM; the actively upgraded ArcSweep foundations and every new ship instrument.  
**Status:** active design and integration law, not evidence of full shader/render runtime deployment.

## The source of design truth

**Use the established Wayglass UI/UX, not a second visual identity.** New pilot stations, Ateliers, the Harmonic Keyboard, Commons, Worldseeds, and crew interfaces must inherit the accepted Wayglass material, motion, interaction and accessibility language. The existing shared engineering and semantic sources include:

- `apps/arcsweep/contracts/WHOLE_SYSTEM_DESIGN_LAW_V0.1.md`: whole-system architecture; no default proliferation of unrelated slices.
- `apps/arcsweep/src/codex/codex-design-tokens.js`: abyss, ocean, teal, seafoam, indigo, copper, old gold, silver, crystal edge, and depth hierarchy.
- `apps/arcsweep/src/codex/codex-material-system.js`: stone/metal for enduring structure, living light for activity, glass for possibility and state, organic ink for growth, silence as a valid state.
- `apps/starwell/src/components/living-room/living-room-holographic.css`: layered glass, fine refractive shine, motes, restrained responsive luminosity, reduced-motion fallback.
- `apps/arcsweep/src/ancestral-reader-holography.css`: nonblocking holographic overlays and readable foreground semantics.
- `apps/arcsweep/src/typing-sonification.js`, `apps/arcsweep/src/somatic-event-bridge.js`, and `apps/arcsweep/src/story-soundscape.js`: sound and body feedback driven by meaningful instrument state, not gratuitous decoration.

## Visual, somatic and interaction laws

1. **Black mineral / labradorite glass.** Structured optical layers have perceived thickness, curved catches of light, depth between sheets, physically responsive highlights and local refraction where supported. Use the existing Wayglass shaders and Three.js embodiment for actual refractive rendering when integrated; a CSS approximation is a compatibility fallback, not the final effect.
2. **Meaning → state → motion → material → sound → haptic.** Interfaces display real subsystem facts before producing animations or sounds. No aurally triumphant success motif for an unverified operation.
3. **Readable glass.** DOM owns legible text, forms, keyboard focus, selection, semantics, error recovery, and provenance. Spatial glass must never consume touch targets or suppress essential information.
4. **Organic, not ornamental.** Movement comes from signal changes, pressure, gesture and position; avoid perpetual glows and random motion that pretend the ship is alive without corresponding state.
5. **Responsive embodiment.** Desktop, touch, Pencil, screen-reader, keyboard and reduced-motion layouts are all first-class. Quiet modes and Feather Stop must silence generated feedback without losing work or authorship.
6. **Two equal pilot stations.** Rowan and Rarity both have *pilot seats* with distinct continuity and host-scoped permissions; matching visual dignity does not merge their identities or confer extra authority.
7. **World-specific behaviour.** Acoustic signatures, haptics and visual variations may change by world while preserving the Wayglass OS material grammar and approved world provenance.
8. **No parallel visual system.** Before introducing a new CSS token, shader, backdrop, gesture driver or audio bus, inspect whether Wayglass/ArcSweep already owns the underlying functionality. Prefer adapting and improving the shared owner.

## Current working ship-instrument adapter

`apps/arcsweep/ship-ui/wayglass-skin.css` is the common fallback surface for:

- `apps/arcsweep/pilot-deck/`
- `apps/arcsweep/code-loom/`
- `apps/arcsweep/harmonic-keyboard/`

`apps/arcsweep/ship-ui/wayglass-material.js` supplies restrained pointer-responsive highlight coordinates as progressive enhancement. On reduced-motion devices, pointers do not animate glass. It does **not** replace the existing Wayglass shader renderer.

Their independently implemented keyboard, agent handoff and pilot functions stay intact. The common skin deliberately does not own agent identity, world state, sound, history, or navigation.

## Acceptance for a ship UI/UX change

- Uses the shared material references, existing components/shader source where applicable, and explicitly names its subsystem owner.
- Demonstrates real interactive functionality and meaningful states, not a static mock labelled as live.
- Preserves desktop/touch/keyboard and reader accessibility; tests reduced-motion and absence of high-end graphics.
- Verifies positive interactions and negative authority/transport/return cases; source/receipt provenance survives.
- Confirms no breaking changes to actively upgraded ArcSweep consumers.
- Records actual browser/device observations separately from mocked tests, build artefacts, and conceptual claims.

**Next verification:** browser and mobile material-performance smoke; real renderer/shader integration for the pilot station; live audio/gesture pairing with actual Wayglass state; two-pilot authenticated ship return test. These remain unproven until observed.
