# House Visual Design Studio Ingest v0.1

Status: School research ingest  
Institution: House School / AI University  
Scope: House Workspace OS, ArcSweep, Flameclyffe, School, Crow, agent desks, mobile/PWA, design tooling

## Purpose

Turn a broad set of visual-editor, UI-agent, component-library, design-system, mobile-pattern, and design-review sources into a House-native design architecture.

The goal is not to copy any one product's look. The goal is to teach agents to make interfaces that are understandable, beautiful, responsive, inspectable, reversible, and faithful to House state and authority boundaries.

A good House interface should let a user move from intention to action without fighting the interface, while still making the underlying state legible when it matters.

## Sources inspected

- `onlook-dev/onlook`
- `ZSeven-W/openpencil`
- `benjitaylor/agentation`
- `JimLiu/baoyu-design`
- `Jakubantalik/Libraries.dev`
- `Owl-Listener/designer-skills`
- `miurla/babyagi-ui`
- `carmahhawwari/ui-design-brain`
- `Meliwat/awesome-ios-design-md`
- `theexperiencecompany/gaia-ui`
- `ihlamury/design-skills`
- `praeclarum/ui.md`
- `kemiljk/skills`
- `jaywilburn/refactoring-ui-skill`

These sources differ in age, maturity, licensing, authorship, and evidence quality. External source-specific rules remain source-specific unless deliberately promoted into House doctrine.

---

# 1. Rendered interface and source code should form a closed loop

The strongest transferable pattern from visual-code editors is:

```text
source code
→ running preview
→ rendered element
→ element/source mapping
→ visual feedback or annotation
→ bounded code patch
→ refreshed preview
→ compare
→ accept / revise / revert
```

House adaptation:

```text
select rendered element
→ capture selector + source locator + current state
→ attach user intent
→ propose smallest relevant patch
→ render changed state
→ compare before/after
→ accept / revise / revert
→ receipt
```

The source locator identifies where a change probably belongs. It is not authority to rewrite neighbouring systems.

## Checkpoints and branches

Visual experimentation should be cheap and reversible.

Keep:

- before snapshot
- after snapshot
- semantic state diff
- source diff
- branch or variation id
- rollback checkpoint
- verification result

---

# 2. Pointing is often better than describing

Agentation-style annotation provides a high-value interaction primitive:

```text
point at element
→ identify it structurally
→ attach note
→ preserve route/state/position context
→ hand structured feedback to coding agent
```

For House Workspace this becomes a first-class design-review mode.

Useful annotation payload:

```text
surface_id
route
viewport
selector
source_locator
bounding_region
text_selection? 
user_note
state_snapshot
skin_id
runtime_context?
timestamp
```

Do not make the user describe "the little glowing thing under the left card" when the system can identify the actual element.

Because Agentation is PolyForm Shield licensed, learn the interaction pattern and data shape without copying restricted implementation unless licence terms are intentionally accepted.

---

# 3. Design-as-code should be inspectable and diffable

OpenPencil reinforces an important House principle: visual design state can be represented as structured, versionable data rather than trapped in an opaque canvas.

House design artifacts should aim for:

```text
human-readable
machine-readable
versionable
diffable
renderable
exportable
provenance-bearing
```

Design state may include:

- nodes and hierarchy
- layout constraints
- design variables/tokens
- typography
- material/skin bindings
- interaction states
- responsive variants
- motion definitions
- platform overrides
- source provenance

The design representation is not canon merely because it renders successfully.

---

# 4. Concurrent design agents need spatial ownership and merge receipts

OpenPencil's concurrent-agent direction suggests a useful multi-agent pattern:

```text
orchestrator
→ decompose page into bounded visual regions
→ assign named owner per region
→ agents work independently
→ preview changes concurrently
→ merge through explicit composition
→ verify whole-page coherence
```

House requirements:

- every region has a named owner
- shared token edits are coordinated separately from local component edits
- conflicting changes surface instead of silently last-write-winning
- a merge receipt records contributors, regions, token changes, unresolved conflicts and final verifier

This is useful for Crow + specialist agents inside the School Design Studio.

---

# 5. Skills should route progressively, not flood the context window

Several sources converge on a strong skill architecture:

```text
small router
→ inspect task and evidence
→ load only relevant specialist skill
→ perform work
→ verify
```

The House design curriculum should distinguish:

```text
knowledge skill = what good design means in one domain
workflow command = how to complete a bounded design job
review lens = how to inspect an existing surface
implementation adapter = how this host/runtime performs the work
```

Examples of specialist lenses:

- information architecture
- responsive layout
- typography
- colour/token systems
- forms
- accessibility
- interaction state machines
- gesture design
- mobile platform conventions
- semantic HTML
- motion/fluidity
- visual critique
- prototype-to-production
- AI-output judgement

Do not load every design rule into every UI task.

---

# 6. Intent comes before decoration

The combined lesson from `ui.md`, `dxe`, Refactoring UI-style skills, and the existing House UI work is:

```text
USER ACTIVITY
→ INTERFACE CONTRACT
→ STATE + AUTHORITY
→ INFORMATION HIERARCHY
→ INTERACTION MODEL
→ PLATFORM SEMANTICS
→ VISUAL CHARACTER
→ MATERIAL / SKIN
→ POLISH
```

Do not begin with gradients, cards, fonts, or component libraries before knowing what the room is for.

Ask internally:

- who is here?
- what are they trying to accomplish?
- what should be obvious without explanation?
- what is the primary action?
- what can go wrong?
- what must remain inspectable?
- what should disappear into the background?

---

# 7. Match the user's mental model before exposing the program model

`ui.md` supplies a valuable behavioural prime directive: good UI behaves the way the user reasonably expects.

House adaptation:

- organize rooms around user activity, not database tables
- hide implementation choices unless they affect the user's decision
- prefer recognition over recall
- use platform conventions unless House-specific behaviour genuinely earns a different model
- make destructive or irreversible actions distinct
- preserve work aggressively
- show recoverable paths after errors
- do not teach a surprising interaction with paragraphs when the interaction can instead be redesigned

House interfaces may be unusual in appearance. Their behaviour should still be learnable and predictable.

---

# 8. Native semantics are infrastructure

The `semantic-html-first` lens is promoted into the House implementation stack:

```text
action → button
navigation → link
input → native form control
modal task → dialog/popover where appropriate
disclosure → native disclosure or correctly controlled equivalent
```

ARIA refines semantics; it should not routinely rebuild semantics that native elements already provide.

House tests should verify:

- keyboard activation
- focus visibility and return
- disabled semantics
- form participation
- names/roles/states
- touch parity
- reduced motion
- text scaling

---

# 9. Visual personality is a deliberate parameter, not a default template

Refactoring UI-style source material adds a useful decision layer: determine the intended personality before selecting visual signals.

House adaptation uses contextual axes rather than fixed quadrants:

```text
reserved ↔ expressive
ritual ↔ utilitarian
organic ↔ geometric
quiet ↔ kinetic
dense ↔ spacious
ancient ↔ futuristic
intimate ↔ civic
```

A room may sit at different coordinates from another room while still sharing House interaction and state contracts.

Examples:

- Systems Room: restrained, dense, precise, low decorative motion
- School Lab: welcoming, legible, exploratory, evidence-forward
- Agent Desk: intimate, low-noise, identity-forward, progressive disclosure
- Flameclyffe world surface: organic, atmospheric, spatial, narratively rich

Do not use purple gradients, cyan holography, giant radii, card grids, or any other AI-default visual trope merely because no decision was made.

---

# 10. Component knowledge is useful, but context outranks catalogues

`ui-design-brain`, GAIA UI, Libraries.dev, and design-skill collections provide rich component and effect vocabularies.

House policy:

```text
component catalogue = candidate vocabulary
not design authority
```

Before choosing a component ask:

- what task does it support?
- what state does it expose?
- what state can it mutate?
- what are its empty/loading/error/degraded forms?
- how does it work on touch and keyboard?
- is an existing House primitive already sufficient?

Prefer semantic, source-owned components over decorative wrappers when the latter add no task value.

---

# 11. AI-specific UI needs explicit tool and context surfaces

GAIA UI provides concrete AI-interface primitives such as composers, slash-command tool selection, file/context attachment, tool-call sections, search-result surfaces, knowledge graphs, and chat bubbles.

For House Agent Desks, useful primitives include:

```text
composer
context attachment
skill/tool picker
agent identity header
runtime attestation
context receipt
tool-call chronology
artifact card
approval pause
handoff card
knowledge graph
session resume
```

Do not blindly inherit GAIA styling or GAIA-specific colour constants. We want the interaction atoms, adapted through House contracts and the Universal Skin Engine.

---

# 12. Effects must communicate state or material, not merely spectacle

Libraries.dev is useful as a vocabulary of effects: border light, thinking indicators, voice-reactive glow, living avatars, liquid morphing, metal effects, image transitions.

House rule:

An effect must earn its cost by supporting at least one of:

- status
- affordance
- continuity
- spatial relation
- agent presence
- voice/activity feedback
- hierarchy
- material identity
- world atmosphere

If removing it changes nothing about comprehension, interaction, atmosphere, or identity, it is optional decoration and should be treated accordingly.

Respect reduced-motion and reduced-transparency paths.

---

# 13. Mobile conventions deserve their own knowledge, not scaled desktop

The iOS DESIGN.md corpus is useful primarily as a structured example of encoding platform-native design knowledge:

```text
visual atmosphere
semantic colour roles
typography hierarchy
component states
layout/safe-area rules
materials/depth
motion/haptics
responsive behaviour
platform do/don't
```

House lesson:

Create platform adapters/guides for:

- web/PWA
- iOS/iPadOS
- Android
- desktop pointer/keyboard
- tablet/touch/Pencil where relevant

Do not copy another application's brand identity. Extract platform interaction expectations and implementation patterns, preserving provenance.

---

# 14. Design systems should be project-bound, versioned contracts

Baoyu Design's most transferable architecture is the separation of:

```text
core design methodology
host-specific tool adapter
specialist design skill
starter component/scaffold
project-local design-system binding
```

A House project should be able to bind one or more design systems by version and provenance.

Suggested metadata:

```text
design_system_id
version
primary: true|false
source
license
imported_at
token_namespace
component_namespace
platform_flavour
local_overrides
```

The local project copy or lock record makes a design reproducible even when an upstream system changes.

Do not import proprietary design prompts wholesale merely because a repository claims equivalence with a hosted commercial design system. Learn mechanisms and preserve licensing boundaries.

---

# 15. Design review should be evidence-based and confidence-tagged

The `dxe` review architecture offers a strong verification pattern:

```text
hypothesis
→ representative evidence
→ rendered evidence where possible
→ source evidence
→ platform semantics
→ runtime errors
→ findings with confidence
→ bounded fix
→ re-verification
```

House confidence tags:

```text
confirmed-rendered
confirmed-source
confirmed-runtime
likely
unverified
environment-only
```

Do not call a visual defect confirmed when only source code was inspected.

Do not turn every review lens into a quota for criticism. Verified strengths are evidence too.

---

# 16. Production trust outranks prototype cleverness

A design is not finished when the happy path looks good.

Every meaningful House surface should exercise:

- loading
- empty
- error
- degraded capability
- offline/disconnected where relevant
- permission denied
- long content
- narrow width
- large text
- keyboard-only
- touch-only
- reduced motion
- reduced transparency
- resume/reload

Prototype shortcuts must be marked as such.

---

# 17. Design extraction is evidence, not ownership

Several sources derive style constraints from existing products.

House doctrine:

```text
observe → describe → abstract → attribute
```

not:

```text
observe → clone identity
```

Extractable lessons include:

- spacing rhythm
- density
- hierarchy
- component behaviour
- safe-area strategy
- semantic colour roles
- motion character
- platform conventions

Brand assets, trademarks, distinctive visual identity, proprietary content, and copyrighted expression remain subject to their own rights.

A style reference should never silently become House canon.

---

# House Design Studio workflow

```text
1. FRAME THE ACTIVITY
2. INSPECT EXISTING MATERIALS
3. MAP STATE + AUTHORITY
4. SELECT PLATFORM + INPUT MODES
5. CHOOSE INFORMATION ARCHITECTURE
6. CHOOSE INTERACTION PRIMITIVES
7. DECLARE VISUAL PERSONALITY
8. BIND TOKENS / SKIN / DESIGN SYSTEM
9. BUILD SMALLEST COMPLETE SLICE
10. RENDER LIVE
11. ANNOTATE / POINT / REVISE
12. EXERCISE STATES + ACCESSIBILITY
13. VERIFY SOURCE + RUNTIME
14. ACCEPT / REVERT / BRANCH
15. ISSUE DESIGN RECEIPT
```

## Design receipt

```text
surface:
activity:
platforms:
input_modes:
design_system_binding:
skin:
source_locators_changed:
state_contracts_touched:
rendered_verified:
accessibility_verified:
mobile_verified:
error/degraded states checked:
annotations_resolved:
known limits:
next smallest slice:
```

---

# School curriculum derived from this ingest

Suggested modules:

1. Activity-first interface framing
2. Information hierarchy and density
3. Semantic HTML and native controls
4. Mobile/touch/platform conventions
5. Design tokens and skin systems
6. Visual personality without template drift
7. Component selection and state design
8. Agent chat/composer/tool surfaces
9. Motion, gesture, and material feedback
10. Live preview and source mapping
11. Annotation-driven revision
12. Design-system binding and provenance
13. Accessibility and perceptual neutrality
14. Evidence-based design critique
15. Prototype-to-production hardening
16. Multi-agent visual collaboration

Crow should learn these as design-engineering capabilities, not as a fixed aesthetic personality.

---

# Core invariants

```text
beautiful != correct
polished != authorised
visual prominence != truth
skin != identity
platform convention != canon
component library != design authority
render success != task success
annotation != permission
source locator != ownership
design reference != licence to clone
prototype != production
```

The final House rule is simple:

> Make the interface feel alive, but make its meaning easier to understand than its glow.
