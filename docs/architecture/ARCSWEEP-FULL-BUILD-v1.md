# ARCSWEEP FULL BUILD v1

**Status:** Approved implementation brief  
**Owner:** Boxfire  
**Branch:** `feature/bifrost-full-assembly-v1`  
**Purpose:** Restore Arcsweep as a complete symbolic-state system rather than treating Continuity Gate or Glyph Studio as the whole product.

## Canonical definition

Arcsweep is Hearthgate's symbolic expression, continuity, glyph, brush, world-state and replay environment.

It is **not** any one of these in isolation:

- Continuity Gate
- Glyph Studio
- a font editor
- an SVG canvas
- an Observer dashboard
- a canon browser

Those are organs inside Arcsweep.

Arcsweep receives validated Shared State and Spiral State, renders symbolic expressions of that state, allows human-authored glyph and brush work, preserves continuity boundaries, and emits receipted observations back through Observer.

## Kernel boundary

Canonical flow:

```text
Observer
  -> DEEPStory / DEEPTime / DEEPTheory
  -> Spiral Engine
  -> DualAspectPacket.harmonic_state
  -> Arcsweep
  -> symbolic output / human edits / continuity requests
  -> Observer
```

Arcsweep must not read raw DEEP datasets directly. It reads the same versioned `SpiralState` every other subsystem reads.

Arcsweep must not mutate a sealed `DualAspectPacket`. All writes return new records or new packets.

Arcsweep must never promote canon by itself.

## Product structure

```text
Arcsweep
├── Chamber / Home
│   ├── active world
│   ├── Shared State ribbon
│   ├── Spiral State
│   ├── current Living Glyph
│   ├── recent Observer receipts
│   └── open-work shortcuts
├── Glyph Forge
│   ├── Glyph Studio
│   ├── brush engine
│   ├── glyph grammar
│   ├── layers
│   ├── text and Unicode metadata
│   ├── import/export
│   └── FontForge handoff
├── Living Glyph
│   ├── state-to-glyph compiler
│   ├── temporal evolution
│   ├── replay
│   └── receipt inspector
├── Brush Foundry
│   ├── brush authoring
│   ├── pressure/tilt/velocity response
│   ├── material profiles
│   ├── stylus support
│   └── brush receipts
├── Continuity Gate
│   ├── reviewed continuity intake
│   ├── consent and scope checks
│   ├── session resolver
│   └── zero implicit canon writes
├── Echo Index
│   ├── worlds
│   ├── characters
│   ├── places
│   ├── objects
│   ├── relationships
│   └── aliases
├── Canon Studio
│   ├── source canon
│   ├── project overlays
│   ├── contradiction review
│   ├── acceptance masks
│   └── receipts
├── Resonance Bridge
│   ├── glyph-to-audio mapping
│   ├── audio-to-glyph mapping
│   ├── Runa preview
│   └── keyboard / haptic directives
└── Replay
    ├── DEEPTime references
    ├── branch history
    ├── glyph evolution
    ├── continuity loads
    └── comparison
```

## Shared State ribbon

Every Arcsweep room must display the same compact ribbon:

- active world
- PREMAQ v1: P, C, R, E, M, A, Q
- Spiral phase
- Spiral direction
- confidence
- current receipt count
- Runa status
- Observer status

The ribbon must be generated from shared schemas, not handwritten labels.

Canonical PREMAQ meanings:

- P = Presence
- C = Compression
- R = Resolution
- E = Entropy
- M = Momentum
- A = Agency
- Q = Qualia

Alignment is derived, not an axis.

## Ring 0 — inventory and boundary repair

Before adding features:

1. Inventory every current route, component, schema, local store and API using the name Arcsweep.
2. Classify each as one of: Home, Glyph Forge, Living Glyph, Brush Foundry, Continuity Gate, Echo Index, Canon Studio, Resonance Bridge, Replay, Legacy.
3. Rename UI labels where Continuity Gate or Glyph Studio currently claim to be Arcsweep.
4. Preserve working routes through redirects or route aliases.
5. Add `docs/architecture/ARCSWEEP-COMPONENT-MAP.md` with old path -> canonical organ.
6. Add one top-level route for the actual Arcsweep shell.

Acceptance:

- `/arcsweep` opens the Arcsweep Home.
- Continuity Gate and Glyph Studio are reachable from it.
- Existing deep links continue to work.
- No destructive migrations.

## Ring 1 — Arcsweep shell

Create a top-level local-first application shell.

Suggested paths:

```text
apps/starwell/arcsweep/index.html
apps/starwell/arcsweep/arcsweep-app.js
apps/starwell/arcsweep/arcsweep.css
apps/starwell/arcsweep/routes.js
apps/starwell/src/arcsweep/arcsweep-state.js
apps/starwell/src/arcsweep/arcsweep-store.js
apps/starwell/src/arcsweep/arcsweep-receipts.js
```

Home must show:

- current Living Glyph preview
- active world
- Shared State ribbon
- Spiral State summary
- recent observations relevant to glyph/continuity work
- open glyph projects
- active continuity packets
- quick links to Forge, Brushes, Gate, Echo Index, Replay

Empty state must still show the organism: world, state, Observer health and a seed glyph. It must not be a blank dashboard.

## Ring 2 — canonical Arcsweep state contract

Add versioned schemas:

```text
apps/starwell/src/arcsweep/schemas/arcsweep-session.schema.json
apps/starwell/src/arcsweep/schemas/glyph-record.schema.json
apps/starwell/src/arcsweep/schemas/glyph-state.schema.json
apps/starwell/src/arcsweep/schemas/brush-profile.schema.json
apps/starwell/src/arcsweep/schemas/glyph-grammar.schema.json
apps/starwell/src/arcsweep/schemas/arcsweep-receipt.schema.json
```

Minimum `ArcsweepSession`:

```json
{
  "schema": "hearthgate/arcsweep-session/v1",
  "session_id": "...",
  "world_id": "...",
  "packet_id": "...",
  "harmonic_state_ref": "...",
  "active_glyph_id": "...",
  "active_brush_id": "...",
  "continuity_context_refs": [],
  "opened_at": "...",
  "receipts": []
}
```

Minimum `GlyphRecord`:

```json
{
  "schema": "hearthgate/glyph-record/v1",
  "glyph_id": "...",
  "name": "...",
  "world_id": "...",
  "grammar_tokens": [],
  "strokes": [],
  "layers": [],
  "semantic_intent": {},
  "source_receipts": [],
  "versions": [],
  "canon_status": "draft"
}
```

All records are append-only or versioned. No silent overwrite.

## Ring 3 — Brush Foundry

The current Glyph Studio needs a real brush engine.

A brush is not just size and opacity. It is a versioned material-response profile.

Required baseline brushes:

- Stonewood Ink
- Copper
- Water
- Charcoal
- Ember
- Ice
- Light
- Gold Leaf
- Glass
- Feather
- Violet Flame

Each profile declares:

- pressure curve
- tilt response
- velocity response
- width range
- opacity range
- spacing
- smoothing
- scatter/noise
- edge breakup
- flow
- bleed
- drying
- pigment/material tags
- compositing mode
- haptic hint
- sound hint

Input support:

- Pointer Events
- Apple Pencil / stylus pressure where exposed
- tiltX / tiltY
- twist where available
- mouse fallback
- touch fallback

Acceptance:

- Two brushes produce visibly and structurally different stroke data.
- Pressure changes width or opacity according to profile.
- Tilt can be enabled/disabled per brush.
- Every stroke stores brush version and input samples.
- SVG export remains possible.
- Unknown hardware degrades cleanly.

## Ring 4 — Glyph grammar

Create a formal grammar independent of any individual image.

Baseline grammar tokens:

- circle / closed continuity
- open circle / invitation
- spiral / recursive becoming
- ripple / propagation
- vertical flame / transformation
- crossing / bridge
- fork / branch
- merge / convergence
- broken line / interruption
- double line / reinforcement
- gap / withheld connection
- enclosure / protection
- axis / orientation
- mirror / reflection
- knot / binding
- release stroke / opening

Each token declares:

- semantic role
- geometric constraints
- optional world-specific meanings
- audio mapping hints
- haptic mapping hints
- allowed relations to other tokens

The engine must allow mystical language and magical concepts while retaining provenance. Symbolic meaning is canon/artifact language unless explicitly promoted through review.

First canonical test glyph:

**Violet Flame over Three Ripples**

- three ripples at the base
- one calm upward violet flame
- water/fire relationship
- transformation arising from three receipted data lineages
- no forced single interpretation

## Ring 5 — Living Glyph compiler

Create a deterministic compiler:

```js
compileLivingGlyph({
  spiralState,
  worldProfile,
  currentGlyph,
  grammar,
  observerRefs,
  options
})
```

Inputs:

- versioned Spiral State
- world profile
- current glyph seed
- Observer receipt references
- user controls

Outputs:

- a new immutable Glyph State
- grammar operations applied
- evolution hints
- confidence
- source receipts
- replay frame

Rules:

- deterministic for identical inputs and seed
- never mutates source glyph
- never changes canon status
- does not read DEEP datasets directly
- can return no change
- user can freeze any layer
- user can reject or branch an evolution

## Ring 6 — temporal evolution and replay

DEEPTime owns canonical temporal coordinates. Arcsweep consumes references through Spiral State.

Replay must show:

- glyph version timeline
- Bifröst lambda where available
- real timestamps
- state snapshot
- grammar operations
- human edits
- automated suggestions accepted/rejected
- branch/fork history
- receipts

Required controls:

- play/pause
- step forward/back
- compare two versions
- branch from selected version
- export replay receipt

## Ring 7 — Continuity Gate integration

Continuity Gate remains a protected organ.

Its law remains:

> Reviewed continuity may enter. Session context may borrow it. Canon does not move.

Add to every continuity packet:

- source Observer receipt
- reviewer identity
- consent scope
- world scope
- confidence
- acceptance mask
- PREMAQ snapshot reference
- Spiral State reference
- expiry/session durability

Arcsweep may visualise and borrow accepted continuity. It may not commit canon.

## Ring 8 — Echo Index and Canon Studio

Add a registry UI for:

- worlds
- characters
- locations
- artefacts
- creatures
- organisations
- relationships
- aliases
- source canon records
- project overlays

Wheel of Time / Ta'veren Vaen must preserve source canon and overlay separation.

No imported wiki record becomes accepted canon solely because it was ingested.

Every record exposes source, revision, licence, transform and acceptance receipts.

## Ring 9 — Runa / Resonance Bridge

Arcsweep and Runa share semantic state but not private implementation.

Add:

- play glyph
- preview brush sound
- world hum context
- glyph-to-audio mapping
- audio-to-glyph capture experiment
- keyboard/haptic hints

Numeric frequency choices belong in versioned DSP profiles, not glyph or world canon.

The bridge reads `DualAspectPacket.harmonic_state` and emits advisory mappings.

## Ring 10 — cross-device installability

Arcsweep must run on:

- Windows desktop package
- Chromium desktop browser
- Android browser/PWA
- iPad Safari/PWA

Required:

- local-first storage
- export/import of complete project bundle
- pointer/stylus feature detection
- no network requirement for core drawing and replay
- accessible keyboard controls
- reduced-motion mode
- high-contrast mode
- autosave with visible status
- crash-safe recovery journal

## UI requirements

Top-level navigation:

```text
Arcsweep
Living Glyph
Forge
Brushes
Continuity
Echo Index
Canon
Replay
```

Every room includes:

- Shared State ribbon
- receipt access
- Runa control
- world identity
- autosave status
- local/remote provenance status

The UI must keep the quiet, inhabited Hearthgate visual language. Empty space is permitted; uninformative emptiness is not.

## Receipts

Every meaningful action writes a receipt:

- session opened
- packet bound
- brush changed
- stroke added
- layer changed
- glyph evolved
- suggestion accepted/rejected
- continuity loaded/cleared
- project exported/imported
- replay branch created

Receipts must contain:

- schema/version
- action
- actor
- timestamp
- world
- source ids
- before/after hashes where applicable
- consent scope
- canon authority = false unless explicitly approved elsewhere

## Tests

Suggested test files:

```text
apps/starwell/test/arcsweepShell.test.js
apps/starwell/test/arcsweepSchemas.test.js
apps/starwell/test/arcsweepSession.test.js
apps/starwell/test/arcsweepBrushEngine.test.js
apps/starwell/test/arcsweepGlyphGrammar.test.js
apps/starwell/test/arcsweepLivingGlyph.test.js
apps/starwell/test/arcsweepReplay.test.js
apps/starwell/test/arcsweepContinuityBoundary.test.js
apps/starwell/test/arcsweepRunaBridge.test.js
apps/starwell/test/arcsweepInstallability.test.js
```

Critical gates:

1. Arcsweep Home exists independently of Continuity Gate and Glyph Studio.
2. PREMAQ labels are canonical.
3. A = Agency and Q = Qualia.
4. Arcsweep reads Spiral State, not raw DEEP datasets.
5. DualAspectPacket remains immutable.
6. No code path silently promotes canon.
7. Glyph changes are replayable.
8. Brush strokes preserve input and profile provenance.
9. Identical compiler inputs produce identical output.
10. Core drawing works offline.
11. Export/import round-trips without losing receipts.
12. Windows, Android and iPad paths fail visibly when unsupported.

## Ordered build plan

Do not attempt the whole cathedral in one commit.

1. Inventory and component map.
2. Arcsweep shell and route.
3. Shared State ribbon.
4. Schemas and local store.
5. Wrap existing Glyph Studio as Glyph Forge.
6. Wrap existing Continuity Gate as protected organ.
7. Brush Foundry v0 with three genuinely distinct brushes.
8. Glyph grammar v0.
9. Living Glyph deterministic compiler skeleton.
10. Replay v0.
11. Echo Index registry shell.
12. Runa bridge skeleton.
13. Cross-device acceptance pass.
14. Expand brushes, world profiles and grammar only after the gates are green.

## Definition of Arcsweep v1 LIVE

Arcsweep may be labelled **LIVE** only when:

- `/arcsweep` is a functioning home, not a redirect to one organ
- Glyph Forge draws and saves real strokes
- at least three material brushes work
- a glyph record is versioned and receipted
- Living Glyph compiles one deterministic evolution from Spiral State
- replay can reconstruct that evolution
- Continuity Gate remains fail-closed
- Echo Index can resolve at least worlds, characters and locations
- Runa can preview one glyph mapping
- project export/import round-trips locally
- tests are green on the supported build matrix

## North star

> Arcsweep is where shared state becomes symbol, symbol becomes a receipted observation, and every transformation remains open to human choice, replay and wonder without end.
