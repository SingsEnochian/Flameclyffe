# Universal Codex Instrument Cabinet v0.1

Status: sandbox/interface contract. This slice does not grant new production authority, external write permission, or autonomous execution.

## Principle

An artefact earns motion or ornament by exposing at least one of:

- state;
- relation;
- transformation;
- computation.

If none apply, the effect does not belong in the Universal Codex.

Every registered instrument also defines a quiet state. Motion must terminate. Reduced-motion operation must preserve the same semantic information.

## First cabinet

| Artefact | Repository state | Semantic job | External specimen/reference |
| --- | --- | --- | --- |
| Leaf | implemented | page state + physical transformation | `wass08/r3f-animated-book-slider-final` as a later skeletal-curl reference |
| Ink | proposed | material state + transformation | `tsurumakishunta/Inkflowpainting` GPU fluid/pigment behaviour |
| Astrolabe | proposed | state + relation + computation | `dcf21/astrolabe` real astrolabe geometry |
| Orrery | proposed | state + relation + transformation + computation | `bitterstoat/orrery` Three.js astronomical interaction grammar |
| Celestial Sphere | proposed | state + relation + computation | `Anypodetos/Lemizh-Constellations` WebGL star sphere |
| Projection Glass | prototype | transient state + transformation | existing Codex manifestations and artefact motion |
| Glyph Surface | implemented | state + transformation + computation | existing STARWELL Glyph Forge; `NH1980MG/witch-hat-atelier-spell-simulator` as deterministic compositional-grammar reference |
| Presence | prototype | state + relation | existing aspect mesh/signatures; `moeru-ai/airi` as presence-layer reference |

External projects are references only in this slice. No external source code is copied or vendored by the cabinet contract.

## Runtime boundary

The cabinet mounts through the existing physical Codex sidecar graph and adds one bounded overlay plus a toolbar doorway. It does not replace:

- the existing Magic Book binding;
- the DOM page interaction surface;
- the Three.js page embodiment;
- page-turn receipts;
- Glyph Forge persistence;
- aspect-mesh semantics;
- Codex motion law or material law.

The cabinet is data-first. The visible overlay renders the registry, including implementation status and semantic axes, so proposed instruments cannot visually masquerade as finished runtime capability.

## Implementation states

`implemented`
: A repository-backed surface or behaviour already exists in the current Codex path.

`prototype`
: The underlying semantic/runtime pieces exist, but the complete instrument surface is not yet finished.

`proposed`
: The contract and reference specimen exist; runtime wiring has not been claimed.

## Next slices

1. Leaf: replace the cosmetic curl with one draggable, pointer/Pencil-aware physical leaf while preserving `turnMagicBookPage`, receipts, equal page sizes, and reduced-motion fallback.
2. Ink: prototype bounded pigment deposition/diffusion on the Glyph Surface, settling to a static semantic result.
3. Glyph grammar: add a deterministic ring/sigil/modifier contract with explicit `documented`, `inferred`, and `experimental` fidelity labels before any 3D manifestation.
4. Celestial instrument: share one data contract across astrolabe, orrery, and celestial-sphere views rather than building three unrelated widgets.
5. Presence: keep identity, aspect role, model backend, and embodiment surface separable.

## Acceptance

- The registry validates with no decorative-only artefacts.
- Every motion profile terminates.
- Every artefact declares a quiet state.
- Implemented, prototype, and proposed surfaces are visibly distinct.
- The cabinet adds no production authority or external writes.
- The physical Codex remains the dominant interface and can rest completely when the system rests.
