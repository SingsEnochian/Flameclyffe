# Wayglass · Interactive Fields Reference: Spacetime + Storm

**Research status:** external visual/interaction references; implementation proposed, not built.
**Recorded:** 2026-11-05
**Related:** [Lantern + Hinge initiative](./WAYGLASS_LANTERN_HINGE_INITIATIVE_20261105.md)
**Sources:** 
- [Alone — CodePen / mielalabs](https://codepen.io/editor/mielalabs/pen/01a17129-d3f7-771a-ac1a-2a80eacce7ae)
- [Curved Spacetime (AI + WebGL) — CodePen / guillhermm](https://codepen.io/editor/guillhermm/pen/01a17f60-e154-7fb2-8556-83897d2b6d2d)

## Verified reference descriptions / access limits

**Alone** is an interactive lighthouse-in-storm scene: lighthouse, rock, storm clouds, mist/rain, lightning, a lighthouse beam and crashing sea. Its public CodePen description identifies three.js, WebGL, raymarching, volumetric light/clouds, Gerstner waves and branching lightning. Its preview offers an audio toggle, with `M` as a keyboard alternative. Source editor panels (HTML/CSS/JS/package.json) stayed in a loading state during inspection, so exact algorithms, package versions, shader source and license were **not** verified. Public visibility does not imply reuse permission.

**Curved Spacetime (AI + WebGL)** presents stars/planets/black holes bending a glowing grid while smaller bodies orbit; dragging a body throws/repositions it and double-click adds a body, per public description. Metadata establishes it as a visual WebGL experiment, but no source-code audit or physics accuracy validation was achieved. In particular, visually curved grids are not proof of a general-relativistic geodesic solver.

## Design discovery: the world is an instrument

These are two complementary interaction grammars:
1. **Deformation / consequence:** field sources change the visible metric/grid, trajectories and relationships. Control action → changed parameters → observable geometric response.
2. **Atmospheric propagation:** a transient event (lightning, moving light, wave) affects other layers (cloud, rain, mist, ocean). Event → coupled media → spatially coherent feedback.

For Wayglass, the winning synthesis is a **field that behaves**, not a static animation behind data. The user should be able to handle mathematical quantities and see the resulting transformations, while the source receipts explain what was simulated and what was observed.

## Proposed Wayglass Living Observer prototype

A dedicated **Interactive Fields Lab** would own the following state:
- `field_sources[]`: id, position, mass/influence parameter, velocity, active state, provenance.
- `field_model`: named algorithm and version (illustrative potential vs validated physics).
- `observer_state`: selected coordinate, local gradient, deformation Jacobian, determinant, singular values, condition number, and fold indicators.
- `atmosphere`: optional render-layer state for volumetric fog, intensity and temporal events.
- `artifact_interaction`: Lantern/Compass/Mirror mode, gesture, selection, access scope, and receipt reference.
- `view_state`: pan/zoom/camera, reduced-motion/low-power mode, separate visual and auditory signals.

### First engineering slice: *Bend and Reveal*

1. Render a planar mesh and 1–3 movable influences with a deliberately labelled illustrative softened potential.
2. Use displacement from the chosen field to draw transformed grid lines and particle trajectories.
3. Derive the numerical deformation Jacobian **from the same function used for rendering**, not from a second decorative computation.
4. Lantern Reveal shows local gradient, Jacobian, singular values, condition number and source parameters at the pointer. Distinguish calculated quantities from visual motifs.
5. Compass Orient shows candidate vector-field trajectories and alternate bearings; it must not autonomously traverse them.
6. Mirror holds a before/after pair with model/parameter provenance and replayable snapshot.
7. Once the geometric pipeline is evidenced, add *a separate atmospheric lab* using a wave surface (Gerstner-style superposition), controllable fog/beam, and bounded lightning events that affect scene illumination.

### Isolation and performance

Keep numerical model, solver, renderer, input handling and provenance recorder as distinct modules. Decouple fixed-rate simulation ticks from render FPS. Provide CPU-safe fallback (2D canvas or static geometry), WebGL loss recovery, capped particles/lightning cost, pause/cancel, reduced-motion, no-sound and keyboard/touch alternatives. Avoid white-flash transitions. In particular, atmosphere must never be mistaken for physical telemetry: use visible labels `simulated`, `observed`, `inferred`, `symbolic` where appropriate.

### Reference-to-implementation discipline

- Credit both originating CodePens and authors/pages.
- Independently implement techniques from documented maths and graphics references rather than importing unlicensed source.
- Track demonstration screenshots/descriptions as visual inspiration, not performance or correctness tests.
- Keep numerical test fixtures for simple one-source symmetry, zero-field identity deformation, multiple-source superposition and near-singular Jacobian behavior.
- Ensure drags create attributable model-state changes and undo/return receipts; the model must remain deterministic under fixed seed/time-step and saved inputs.
- Compare geometry-derived values against controlled reference calculations before calling the Jacobian Fold Detector verified.

## Immediate acceptance gate

A user moves one source, the grid and test particles visibly respond, Lantern reads out the actual numerical deformation at the selected point, and a saved replay reproduces the same state. This is our first **functional toy**. The storm scene is a later compositional layer, not a prerequisite that blocks an executable numerical prototype.

**Research question:** When geometry, atmospheric propagation and embodied input share state, how much of Wayglass can become directly intelligible without menus?
