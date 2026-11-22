# House Design Studio Routing v0.1

Use this beside `SKILL.md` when a UI task needs deeper design judgement.

Do not load every design lens automatically. Route from the actual task and evidence.

## Core order

```text
intent
→ semantics
→ information architecture
→ interaction
→ platform behaviour
→ visual personality
→ materials/skin
→ live verification
→ production hardening
```

## Router

| Evidence / task | Load or apply |
|---|---|
| User cannot tell what a screen is for | activity-first framing + information hierarchy |
| UI feels generic/template-like | visual personality + subtractive design + AI-output judgement |
| Forms, dialogs, menus, controls | semantic HTML/native controls + accessibility |
| Mobile/PWA/iPhone/Android | platform-specific safe areas, touch, typography, motion, navigation |
| Agent chat/workspace | composer, context attachment, tool chronology, artifact, approval, session primitives |
| Existing rendered UI needs revision | annotation/source-locator loop |
| Complex visual build | design-as-code + checkpoint/branch flow |
| Multiple agents building one surface | region ownership + merge receipt |
| Design system exists | bind version/provenance first, then design within contract |
| Motion/gesture matters | fluid interaction, interruption, reduced-motion path |
| Prototype looks good but may be fragile | loading/error/empty/auth/resume/long-content/reduced-motion hardening |
| Review request | rendered + source evidence, confidence tags, bounded fixes |

## Point-to-edit loop

```text
select element
→ capture selector/source locator/state
→ attach instruction
→ patch smallest relevant source
→ render
→ compare before/after
→ accept / revise / revert
```

Never make the user translate a visible target into a filename when the system can recover that mapping.

## Visual personality declaration

Before styling a new room, declare a compact personality vector:

```text
reserved / expressive:
ritual / utilitarian:
organic / geometric:
quiet / kinetic:
dense / spacious:
ancient / futuristic:
intimate / civic:
```

Then state 3–6 concrete implications for typography, density, geometry, material, motion and colour.

This is a design choice, not identity or canon.

## Component selection test

For every non-trivial component ask:

```text
What activity does it serve?
What state does it show?
What state can it change?
What are loading/empty/error/degraded states?
Does it work by keyboard and touch?
Is a native primitive sufficient?
Is an existing House primitive already sufficient?
```

Component libraries are vocabulary, not authority.

## Review confidence

Use:

- `confirmed-rendered`
- `confirmed-source`
- `confirmed-runtime`
- `likely`
- `unverified`
- `environment-only`

Do not report a rendered defect as confirmed from source inspection alone.

## House anti-default rule

Never choose a visual move merely because it is common in generated UI.

Examples to question rather than automatically reject:

- purple/blue gradients
- cyan holographic glow
- identical three-card grids
- huge radii everywhere
- shadows on every surface
- default SaaS hero structure
- identical spacing rhythm across every section

A familiar move is fine when it serves the room. It is weak when it substitutes for a decision.

## Production pass

Before declaring a surface finished, exercise relevant states:

```text
loading
empty
error
degraded
offline/disconnected
permission denied
long content
narrow phone width
large text
keyboard-only
touch-only
reduced motion
reduced transparency
resume/reload
```

Record what was actually verified.

## Design systems and provenance

When importing or binding a design system, preserve:

```text
id
version
source
licence
primary/secondary role
token namespace
component namespace
platform flavour
local overrides
```

Reference is not ownership. Inspiration is not permission to clone distinctive identity.

## Source family

The research basis for this router is recorded in:

`school/research/HOUSE_VISUAL_DESIGN_STUDIO_INGEST_V0_1.md`
