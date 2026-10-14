# Astra 6 · JCINK + ArcSweep Dark Board Handoff

## Mission

Build one reusable visual grammar that can project into:

1. the JCINK Epra site,
2. ArcSweep,
3. Universal Codex,
4. House Commons,
5. Epra Atlas / STARWELL Atlas Hall,
6. Brush Foundry Interface Lab.

The result should be sleek, dark, information-dense, interactive, and legible. It must feel like a living scientific-magical instrument rather than a generic cyberpunk HUD.

## Current source package

The uploaded JCINK package contains four source modules:

- `module1-core.css`
- `module2-index.html`
- `module3-profiles.css`
- `module4-posting.css`

Important reusable vocabulary from that package:

- near-black / abyssal surfaces,
- restrained glass layers,
- gold + teal semantic accents,
- clipped/cut corners,
- high-density profile and directory cards,
- vector meters,
- status runes,
- tabs and navigation docks,
- category/forum/topic cards,
- quick-reply / posting shells,
- progressive hover/focus disclosure.

JCINK selectors such as `#store`, `.row2`, `.row4`, topic/forum wrappers, UCP/profile hooks, and quick-reply selectors are adapters only. They are not ArcSweep architecture.

## Interaction law

Every information-bearing element should support the same ladder:

`GLANCE -> INSPECT -> OPEN / ACT`

Examples:

- a status glyph shows state at a glance, explains it on hover/focus, and opens the underlying panel on activation;
- a meter shows value, reveals provenance/meaning on inspect, and opens history/receipts on activation;
- an Atlas marker shows kind/location, reveals a summary, and opens the Codex entity;
- a Commons badge shows presence, reveals status details, and opens participant/context information.

No important information may exist only as colour, glow, animation, or decoration.

## Visual direction

Use the JCINK package as a starting grammar, not as a literal skin transplant.

Preferred:

- `#050507` to `#10141a` base surfaces,
- soft glass rather than bright neon glass,
- old-gold / champagne for durable or canonical structure,
- sea-glass teal for active/current state,
- copper for lineage / physical warmth,
- violet only as a secondary accent,
- serif display type for titles + readable modern sans/system type for dense controls,
- generous negative space around primary hierarchy while keeping panels information-dense,
- short clipped corners, inset lines, 1px borders, extremely restrained glow,
- hover/focus movement of 1–2 px at most,
- data boards, dossiers, drawers, tabs, inspectors, and cards instead of giant floating holograms.

Avoid:

- full-screen scanlines,
- orbit rings around the whole viewport,
- perpetual ambient pulses,
- infinite particle canvases,
- constant glitch text,
- bloom that obscures copy,
- moving backgrounds that compete with reading,
- using Orbitron everywhere,
- treating magenta/cyan as the only way to signal state,
- inventing a second canonical data store for presentation.

Motion belongs to interaction, state change, provenance reveal, page turn, or explicit cinematic projection. Respect reduced-motion settings.

## ArcSweep implementation already started

This branch adds:

`apps/arcsweep/src/arcsweep-dark-board.css`

and loads it from:

`apps/arcsweep/index.html`

The stylesheet rebinds ArcSweep's existing semantic tokens and styles the existing shell/components rather than replacing their behaviour. It intentionally keeps navigation, panels, forms, tables, Commons, applets, status boards, and existing accessibility semantics intact.

Do not fork ArcSweep state to make the theme work. Style existing semantic classes and data attributes.

## Universal Codex animation work to preserve

The Codex now has bounded physical/projection animation layers:

- page light,
- latent ink,
- shallow depth motion,
- liquid ink,
- edge glint,
- glyph bloom,
- trace thread,
- page wake,
- gesture afterimage.

Relevant files:

- `apps/arcsweep/src/universal-codex-animation-model.js`
- `apps/arcsweep/src/universal-codex-animation-sidecar.js`
- `apps/arcsweep/src/universal-codex-artefact-motion-model.js`
- `apps/arcsweep/src/universal-codex-artefact-motion-sidecar.js`
- `apps/arcsweep/src/magic-book-sidecar.js`
- `apps/arcsweep/src/magic-book-physical-acceptance-entry.js`

Rules:

- motion is finite;
- reduced motion collapses or disables effects;
- the render loop sleeps when idle;
- projections never become evidence, canon, identity, or authority;
- the book remains the interaction surface;
- magic stays inside the artefact instead of becoming a whole-screen HUD.

## Interface Foundry + Epra Atlas work to preserve

PR #403 currently contains the reusable Interface Foundry and the Atlas Hall bridge.

Important paths:

- `apps/starwell/public/interface-foundry/`
- `apps/starwell/public/interface-foundry/interface-foundry.js`
- `apps/starwell/public/interface-foundry/interface-foundry.css`
- `apps/starwell/public/interface-foundry/epra-atlas-components.js`
- `apps/starwell/public/interface-foundry/epra-atlas-foundry.js`
- `apps/starwell/public/interface-foundry/atlas-hall-bridge.js`

The component inventory already treats ArcSweep HUD, Universal Codex, Epra Atlas, House Commons, and JCINK as theme/projection targets over shared interaction contracts.

Atlas Hall currently demonstrates layers, regions, markers, semantic inspection, cinematic routes, route scrubbing, and fly-path playback. Demo geography remains explicitly non-canon.

## Repository donors / references already reviewed, forked, copied, or retained for this programme

Use local/user-owned copies first where they exist. Treat external repositories as method/component donors, not as authority over our architecture.

### User-owned / active build repositories

- `SingsEnochian/Flameclyffe` — ArcSweep, Universal Codex, STARWELL, House Commons, Interface Foundry.
- `SingsEnochian/k-dense-byok` — research-agent chassis, provenance, notebooks, tool-oriented research workflows.
- `SingsEnochian/science-superpowers` — scientific method, experiment/verification discipline.
- `mdkubit/universalhorizon` — semantic/publication reference layer; reference only, not runtime authority.

### Spatial / 3D / embodiment

- `mrdoob/three.js`
- `pmndrs/react-three-fiber`
- `pixiv/three-vrm`
- `dcf21/astrolabe`
- `bitterstoat/orrery`
- `Anypodetos/Lemizh-Constellations`
- `realistic_holography` local/forked reference

Methods to borrow:

- scene/camera/object separation,
- React-declarative scene composition,
- VRM as an embodiment projection rather than identity,
- real astrolabe/orbital geometry,
- semantic objects projected into spatial views.

### Books / codices / editors / page motion

- `Morningstar-Developments/Digital-Grimoire`
- `Innei/haklex`
- `MotionBook` local/forked reference
- `BookPageFlipAnimation` local/forked reference
- `grim-tome` local/forked reference

Methods to borrow:

- source / interpretation / question / canon separation,
- one structured document state with multiple renderers,
- diff/review overlays,
- bounded page motion,
- book/page geometry without turning the book into a static screenshot.

### UI / motion / component systems

- `magicui` local/forked reference
- `react-magic` local/forked reference
- `react-magic-ui` local/forked reference
- `animated-react-collection` local/forked reference
- `21st.dev` component references
- `magic-motion` local/forked reference
- `wizard` local/forked reference
- `arwes/arwes` reference only; mine interaction grammar, do not adopt its full sci-fi skin.
- `dpwoert/magic-circle`
- `tsurumakishunta/Inkflowpainting`

Methods to borrow:

- component composition,
- motion primitives,
- clean responsive cards/drawers/tabs,
- isolated WebGL/ink surfaces where they add meaning,
- progressive disclosure,
- token-driven theming.

Do not import a dependency merely to imitate one visual effect that can be expressed with native CSS.

### Agent / OS / social systems

- `agentculture/agentirc`
- `Hologram-Technologies/hologram-os`
- `jangtrinh/design-os-generative-ui`
- `NandhaKishorM/laya`
- Laya MLX/CoreML ports already reviewed
- `LifeOS` local/forked reference
- `airi` local/forked reference
- `jarvis` local/forked reference

Methods to borrow:

- stable IDs / cursor resume / backfill,
- explicit backpressure,
- semantic object graphs + provenance,
- validated UI specification before hydration,
- System-1 UI/routing judgment only when confidence allows,
- capability boundaries and visible receipts,
- projection state separate from identity/canon/authority.

### Research / media / image generation

- `Tencent-Hunyuan/HunyuanImage-3.0`
- Google/Gemini image-editing patterns reviewed
- Apple Image Playground bridge patterns reviewed
- local ComfyUI / TJ Studio generator path in ArcSweep

Use image/media generation as a capability routed through Hearthweave/provider contracts, not as direct UI authority.

## JCINK implementation method

Build the forum skin as progressive enhancement over JCINK's existing HTML.

Layering:

1. **Tokens** — colour, type, spacing, line, shadow, corners, motion.
2. **Primitives** — panel, card, badge, rune, meter, tabs, popover, drawer, button, input.
3. **Patterns** — forum row, topic row, member card, profile, directory, store, quick reply, post wrapper.
4. **JCINK adapters** — selectors mapping JCINK output to the shared primitives.
5. **Optional JS enhancement** — tab state, drawers, expand/collapse, semantic inspectors, keyboard support.

The base forum content must remain readable if JS is absent.

Replace the uploaded prototype's perpetual particle/veil engine with optional interaction-bound effects. Do not run a permanent `requestAnimationFrame` field just to make the page feel alive.

## ArcSweep implementation method

ArcSweep should use the same tokens and primitive grammar while preserving its current component classes and semantic state.

Priority styling targets:

- `.app-shell`
- `.sidebar`
- `.nav-button`
- `.panel`
- `.hero`
- `.item-card`
- `.applet-card`
- `.facts`
- `.runtime-flame`
- `.commons-entry`
- `.queue-entry`
- forms / fieldsets / inputs / tables
- Houseglass
- Codex launch/control surfaces
- Atlas / Interface Foundry launch surfaces

Do not rename classes solely for aesthetics.

## Information-board rules

1. Every board/card exposes a title, state, and semantic identity.
2. Status colour always has a text/icon/state equivalent.
3. Hover must have a keyboard/focus equivalent.
4. Touch cannot depend on hover-only curtains.
5. Expanded content must remain selectable and scrollable.
6. Cards may animate only during a transition the user can understand.
7. No canon or authority mutation from a CSS/visual interaction alone.
8. Component styling must survive desktop, tablet, iPad/Pencil, and mobile navigation.
9. Prefer CSS variables and semantic attributes to per-screen hardcoded colour values.
10. Generated or model-selected layout hydrates real data only after schema validation.

## Acceptance pass

Astra should verify:

- JCINK board is dark, coherent, and usable without JS;
- ArcSweep theme loads after the existing base styles;
- no core state/runtime code is duplicated;
- navigation remains scrollable and touch-safe;
- form contrast and focus-visible states pass visually;
- reduced-motion mode removes nonessential motion;
- no perpetual scanline/ring/particle animation was introduced;
- Universal Codex text remains unobscured;
- House Commons stays recognisably a social surface, not a cockpit;
- Atlas remains a projection of semantic world data;
- Interface Foundry shows reusable components rather than screenshots;
- build/tests remain green;
- produce a live preview link and test desktop + touch dimensions before sign-off.

## First Astra pass

1. Read the uploaded four-module JCINK package and this handoff.
2. Inspect the repositories/copies above for methods, not wholesale skins.
3. Refine `arcsweep-dark-board.css` against the live ArcSweep DOM.
4. Build a JCINK adapter stylesheet from the same tokens/primitives.
5. Put JCINK component examples into Interface Foundry so they are interactively inspectable.
6. Keep Universal Codex animation page-born and finite.
7. Verify current PR #403 and publish the live review surface.

The target feeling is: **dark instrument board, old-gold structure, sea-glass activity, physical depth, restrained motion, information everywhere, nothing merely decorative.**
