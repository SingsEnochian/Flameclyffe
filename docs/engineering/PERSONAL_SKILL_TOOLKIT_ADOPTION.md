# Personal skill toolkit adoption for Wayglass

**Source:** [Aamir1873/personal-skill-list](https://github.com/Aamir1873/personal-skill-list), inspected 26 November 2026  
**Adoption target:** Wayglass / ArcSweep / Watercolour / Universal Codex / related first-party surfaces  
**Status:** adopted as a development and review standard; individual runtime capabilities still require implementation and verification.

This document records how the source repository's available skills are to be used in our work. It does not claim that the upstream Claude Code plugins are installed, that every example has been ported, or that reading a skill changes runtime behaviour.

## Working rule

Use the relevant skill material as an active method while designing, implementing, reviewing and testing. Do not merely cite it in a plan. Before changing an existing organ, inspect its owner, current implementation, callers, tests, design tokens and deployment path. Prefer a small, reversible integration into the existing organ over a parallel subsystem.

Every delivery must state, in plain language:
- what changed and where;
- what was actually executed and what passed;
- what remains unverified;
- blockers, missing access, dependencies or decisions;
- the next concrete action.

Never ask Rowan to interpret source code. Explain decisions and failures in ordinary language, with a short technical appendix only when useful. Ask Rowan only for choices that require her authority, preference, credentials or consent.

## Skill adoption map

### Writing quality
Use `humanizer`, `stop-slop` and `natural-human-writing` when drafting or editing prose, documentation, interface copy, summaries and public-facing explanations.

Preserve meaning, source facts, names, numbers, quotations, attribution and the author's voice. Remove generic filler, inflated claims, formulaic contrast structures and repetitive chatbot phrasing. Do not manufacture casualness, typos or personality. The user's requested voice and the actual audience take precedence over generic style rules. Do not flatten Wayglass's mythic vocabulary when it carries intentional meaning.

### StageShow and motion storytelling
Use `stageshow` for product demonstrations, animated interface explanations, feature illustrations, onboarding scenes, visual changelogs and explanatory showreels.

Its workflow is binding for those deliverables:
1. Plan the frame, focal object, action and payoff before coding.
2. Start from the closest strong example, adapting its composition rather than copying its identity.
3. Design at the actual display size; make a separate compact layout rather than shrinking a desktop scene.
4. Give motion a cause and a readable sequence. Keep the result visible.
5. Design a complete reduced-motion still/poster.
6. Rehearse the full sequence, loop seam, controls, mobile width and reduced-motion state.
7. Record the example used, changes, checks, assumptions, unresolved items and anything not inspected.

The source's StageShow kit is React-based. Our Wayglass shell currently uses vanilla JavaScript modules, while React and React Three Fiber exist in the root dependency set. Do not introduce a second framework or mount a React island merely to use a kit. First decide whether a StageShow scene belongs in an existing React/R3F host, can be isolated cleanly, or should be implemented natively with the same composition and rehearsal discipline.

StageShow's source states that its code is MIT licensed. Its notice excludes third-party app icons and trademarks from that grant. Preserve notices and verify each asset's own rights before reuse.

### Three.js: all thirteen skill areas
Use the source's Three.js skills as a complete technical reference set for relevant 3D work:

1. fundamentals: scene, camera, renderer, coordinate systems, lifecycle;
2. geometry: primitives, BufferGeometry, attributes, transforms and instancing;
3. materials: PBR, physical materials, transparency and material lifecycle;
4. lighting: physically meaningful lights, environment lighting and shadows;
5. textures: UVs, colour spaces, filtering, HDR environments and GPU memory;
6. loaders: glTF/GLB, textures, HDR/EXR, progress, caching and disposal;
7. asset pipeline: inspect, validate, compress and optimise before shipping;
8. animation: keyframes, skeletal/morph animation, procedural motion and blending;
9. interaction: raycasting, pointer/touch input, controls and accessible alternatives;
10. shaders: GLSL/TSL, uniforms, coordinate spaces and shader lifecycle;
11. post-processing: bloom, depth of field, compositing and output colour;
12. performance: measure draw calls, triangles, CPU/GPU frame time and memory before tuning;
13. React Three Fiber: Canvas ownership, hooks, events, Suspense, disposal and adaptive performance when the host is React.

Use the skill that matches the work, and consult adjacent skills when a change crosses boundaries. 3D features must have an explicit lifecycle: create, attach, resize, pause/offscreen, restore, dispose. Share geometry, materials and textures where appropriate; avoid duplicate render loops and duplicate audio/graphics engines. Use measured performance evidence, not guesses.

**Version gate:** the upstream Three.js skills declare a target of r186. The inspected Wayglass canonical branch lockfile currently resolves Three.js 0.185.1. Do not copy r186-only APIs or examples blindly. Confirm the installed version and API compatibility before using any version-sensitive loader, renderer, WebGPU, TSL or post-processing API. A dependency upgrade requires its own compatibility review and tests.

### Design, accessibility and UX
Use the listed design skills (design critique, UX copy, accessibility review, design system, frontend design, website design and audit-suite) as review lenses for interface work.

Check:
- hierarchy, composition, visual density, typography, contrast, spacing and consistent tokens;
- keyboard-only operation, focus visibility, semantic controls, screen-reader names and touch target sizes;
- reduced motion and reduced transparency;
- loading, empty, error, disabled, success and interrupted states;
- responsive layouts at actual phone and desktop widths;
- interaction feedback, undo/cancel where appropriate, and clear user control.

A visual pass is not an accessibility pass. Report what was checked and what still needs a real device or assistive-technology check.

### Engineering practice
Use the listed engineering skills (code review, system design, architecture, testing strategy and documentation) on every meaningful implementation.

- Read the canonical owner and existing code before adding a new organ.
- Define acceptance criteria before coding.
- Keep changes small enough to review and reversible.
- Add tests for behaviour, boundaries, failure cases and regression risk.
- Preserve existing tests and do not weaken acceptance criteria to obtain a green result.
- Review security, secrets, input validation, permissions, data retention and external-provider boundaries.
- Document public contracts, decisions, provenance and operational recovery.
- Run the actual build and tests. A passing static check does not prove live behaviour.

### Supabase and data
The README lists Supabase skills, but does not include their skill files. Use the already available Supabase connector and the repository's existing database contracts. Before schema, query, RLS or migration work, inspect current tables, policies, migrations and consumers. Prefer additive, reversible migrations. Never infer that a program or record exists because a UI or documentation page names it.

### Remotion and motion-reel
The README names Remotion best-practices and motion-reel skills, but their implementation files are not included. Treat these as source pointers, not locally available skills. For video work, use an available, verified video toolchain and apply the StageShow story/rehearsal principles. Before adding Remotion, inspect the actual app/build environment, licensing and deployment cost.

## Referenced plugins: availability boundary

The README links to external plugin repositories for design, engineering, frontend design, Supabase, website design, audit-suite, Remotion and motion-reel. Their plugin source files are not present in this repository. They are not installed merely because the README lists them.

Use a connected app/tool when it is available and appropriate. If a task needs a missing plugin-specific capability, say so and propose the smallest useful next step: inspect the upstream source, connect/install the plugin with Rowan's approval, or implement the required capability locally. Never claim an unavailable plugin ran.

## Wayglass integration boundaries

- Keep the canonical branch `wayglass/current` as the integration home.
- Keep the existing vanilla Wayglass shell and its surface registry unless a measured design decision justifies a framework boundary.
- Use the existing React/R3F dependencies where a React 3D surface already belongs; do not create another renderer or audio engine.
- Route 3D, animation and material improvements through their current owning surfaces and shared design tokens.
- Keep StageShow-style scenes as first-class explanatory surfaces, not disconnected demos.
- Watercolour remains the image-resolution and material-expression organ; use the Three.js material, shader, texture, asset and performance disciplines there.
- Respect existing canon, sovereignty, Feather cancellation, reduced-motion and accessibility contracts.
- Record provenance for upstream inspirations and preserve third-party notices.
- Documentation adoption is not runtime implementation. A skill being listed here is not evidence that a feature has shipped.

## Acceptance checklist for every relevant change

- [ ] Existing owner, implementation and dependencies inspected.
- [ ] Relevant skill references consulted.
- [ ] Acceptance criteria written before implementation.
- [ ] Existing architecture reused; no duplicate engine introduced.
- [ ] Source, asset and licence provenance recorded.
- [ ] Tests added or updated for changed behaviour.
- [ ] Build and tests executed on the changed commit.
- [ ] Desktop and mobile layouts checked where visual.
- [ ] Keyboard, focus, screen-reader and reduced-motion states checked where interactive.
- [ ] Animation rehearsed at speed and at transition frames where applicable.
- [ ] Performance measured for substantial 3D scenes.
- [ ] Remaining gaps and unverified behaviour disclosed in plain language.
- [ ] Rowan receives a human-readable change report, not a code-reading assignment.

## Source inventory

The inspected repository contains the three writing skills, StageShow and its examples/kit/references, and thirteen Three.js skills. Its README also lists plugin sources, but says their files are not copied here. The source repository is public and read-only to our connected GitHub account; this adoption is recorded in our own repository and does not modify the source.
