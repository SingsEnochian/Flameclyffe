# Crow UI Construction Source Registry v0.1

Status: source registry / training leads, not canon
Observed: 2026-10-01
Rule: extract transferable mechanisms, tests, and design principles. Do not copy third-party implementation or visual identity into Crow output. Preserve source, licence, and confidence.

## Sources

### heldernoid/openstitch
Source: https://github.com/heldernoid/openstitch
Observed mechanisms: text/screenshot/sketch -> interactive frontend; infinite canvas; linked screen flows; shared DESIGN.md; skills for responsive/a11y/animation/layout; iterative refinement.
Training value: sketch interpretation, screen hierarchy, shared design grammar, flow composition, iteration.
Boundary: local/private deployment warning; reference architecture only unless licence and integration are reviewed.

### tldraw/tldraw
Source: https://github.com/tldraw/tldraw
Observed mechanisms: extensible infinite canvas; pressure drawing; custom shapes/tools/bindings; runtime Editor API; agent starter that reads/modifies canvas; workflow/node builder; AI chat; image pipelines; touch/tablet/mobile support.
Training value: canvas as thinking surface; spatial editing grammar; agent-visible scene graph; reversible visual operations.
Boundary: production SDK licensing differs from development use. Learn architecture; do not assume production adoption.

### imsidkg/reflow
Source: https://github.com/imsidkg/reflow
Observed mechanisms: sketch/wireframe -> layout hierarchy -> React/Tailwind; frames and generated UI blocks; inspect-and-refine interaction; moodboard; project style guide/tokens.
Training value: perceptual decomposition, targeted revision, hierarchy inference, inspiration-to-system translation.

### 3b3zeem/Velox
Source: https://github.com/3b3zeem/Velox
Observed mechanisms: visual composition with structured/AST-oriented React/Tailwind output and responsive viewport work.
Training value: visual operation -> semantic code transformation; responsive constraints rather than naive scaling.
Confidence: repository requires deeper implementation review before any architectural dependency.

### christinevall/ds-base-ui
Source: https://github.com/christinevall/ds-base-ui
Observed mechanisms: code-first design system; token pipeline; Storybook; Figma bridge; explicit gaps instead of flattening unsupported CSS; prototype -> reviewed implementation workflow.
Training value: primitive vs semantic tokens; round-trip design/code thinking; honest representation gaps; prototype is not production merge.

### vendurehq/design
Source: https://github.com/vendurehq/design
Observed mechanisms: design tokens; React components; design lint; Storybook; portable agent UI/token skills; a11y and visual-regression gates.
Training value: UI composition as an inspectable agent skill; deterministic design constraints; testable design quality.

### heeelol/jester
Source: https://github.com/heeelol/jester
Observed mechanisms: MediaPipe hand landmarks -> stateless gesture/transform controller -> Three.js scene; pinch grab; two-hand scale/rotate; common scene API for voice and hand input; phone/display input abstraction.
Training value: gesture semantics, multimodal intent routing, input-source abstraction, observe-act-feedback loop.
Boundary: OS-control examples are authority-sensitive. Learn interaction architecture; do not transfer action authority.

### ossamamehmood/holoflux-gesture-engine
Source: https://github.com/ossamamehmood/holoflux-gesture-engine
Observed mechanisms: MediaPipe pose state machine; Three.js/GLSL particle response; hand velocity/direction; gesture state -> visual/audio feedback; Web Audio procedural response.
Training value: embodied state machines, continuous motion signals, multimodal acknowledgement, shader-driven spatial feedback.

## Derived curriculum grammar

sketch -> perceive hierarchy -> infer constraints -> semantic layout -> design grammar -> render -> interact -> observe -> critique -> revise

body / hand / pen / voice -> signal -> gesture or intent -> target -> reversible transformation -> multimodal acknowledgement -> resulting state -> receipt

primitive -> semantic token -> component -> state -> composition -> viewport -> accessibility -> visual regression -> living interface

## Provenance invariant

Repository observation != adoption.
Reference implementation != copied implementation.
Aesthetic inspiration != visual cloning.
Training extraction must record source and the mechanism learned.
