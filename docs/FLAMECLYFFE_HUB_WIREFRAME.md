# Flameclyffe Workshop Hub Wireframe

## Purpose

The Flameclyffe Workshop Hub is the front door for everything in this repository.

It should answer five questions quickly:

1. What are we building?
2. What is live?
3. What is playable right now?
4. What is experimental or in repair?
5. Where does the visitor go next?

The hub should feel like a steampunk-celestial workshop map: part observatory, part atlas table, part project cabinet.

## Page Title

**Flameclyffe Workshop**

## Subtitle

*A living observatory of tools, worlds, experiments, and threshold objects.*

## Microcopy

*Working pages, live prototypes, and strange little doors worth opening.*

## Primary Actions

- Enter STARWELL
- View Live Projects
- Visit Workshop Bench

## Core Sections

### 1. Hero / Observatory Door

Purpose: establish the project identity immediately.

Content:

- Title: Flameclyffe Workshop
- Subtitle: A living observatory of tools, worlds, experiments, and threshold objects.
- Microcopy: Working pages, live prototypes, and strange little doors worth opening.
- Primary button: Enter STARWELL
- Secondary button: Open Workshop Bench
- Tertiary link: View Source

Visual direction:

- Steampunk-celestial observatory interior.
- Brass orrery and atlas-table shapes.
- Strong negative space for title text.
- Signal-lamp status rail.

### 2. Featured Projects

Purpose: show the main projects as visual doorway cards.

Each project card needs:

- Project title
- Short description
- Status badge
- Launch link
- Source link
- Optional notes link

Initial featured projects:

#### STARWELL

Status: Prototype / Live Doorway

Description: A living manuscript observatory for worlds that have not happened yet.

Route: `/Flameclyffe/starwell/`

Source: `apps/starwell`

#### Flameclyffe Studio

Status: Live

Description: Resonance, state capsules, dyad tuning, and seven-minute loop experiments.

Route: `/Flameclyffe/`

Source: root static app

#### Sigil Activator

Status: Prototype

Description: Interactive sigil and threshold-interface experiments.

Route: `/Flameclyffe/sigil/` if deployed, otherwise mark as Source Only.

Source: `apps/sigil-activator`

#### EverCore Sandbox

Status: Sandbox

Description: Full-kit EverOS / EverCore memory engine planning, seed schemas, and retrieval tests.

Route: no public launch yet.

Source: `sandbox/everos`

### 3. Live Doorways

Purpose: a simple truth table of what actually opens.

Fields:

- Doorway
- Public route
- Status
- Notes

Initial rows:

| Doorway | Route | Status | Notes |
|---|---|---|---|
| Flameclyffe Home | `/Flameclyffe/` | Live | Root public page |
| STARWELL | `/Flameclyffe/starwell/` | Fallback / Build in progress | Branch fallback exists; full React deploy pending Pages confirmation |
| Studio | `/Flameclyffe/studio.html` | Live if branch-served | Static page |
| Sigil Activator | `/Flameclyffe/sigil/` | Needs verification | Vite app exists but public route must be confirmed |
| EverCore Sandbox | none | Internal | Documentation and helper scripts only |

### 4. Workshop Bench

Purpose: show current active work without hiding the messy middle.

Each bench item needs:

- Name
- Current state
- Next step
- Owner / focus
- Links

Current bench items:

#### STARWELL Observatory Instrument

State: In progress

Next step: verify React/Vite deploy and refine sigil interface.

#### STARWELL Atlas Hall

State: Prototype

Next step: connect world/location records cleanly and show real Supabase rows when available.

#### Live Glyph Viewer / Observer Almanac

State: Prototype

Next step: add CSS polish and confirm import/build path.

#### EverCore Full-Stack Sandbox

State: Planned / external engine required

Next step: choose hosting habitat and run full Docker stack.

#### Steampunk Art Pack

State: Prompt pack pending

Next step: generate hero art and transparent UI ornaments.

### 5. Recent Work / Changelog

Purpose: show that the workshop is alive and make debugging easier.

Fields:

- Date
- Change
- Status
- Notes

Initial entries:

- Added STARWELL branch fallback doorway.
- Added STARWELL sigil observatory instrument.
- Added live glyph import compatibility shim.
- Updated Pages workflow trigger paths.
- Added Workshop Rule 01.
- Added EverCore full-stack memory plan.

### 6. Visual Atlas / Project Cabinet

Purpose: replace generic card-grid navigation with a distinctive map-like interface.

Suggested visual metaphor:

- Central brass dial: Flameclyffe Workshop.
- Orbiting project plates: STARWELL, Studio, Sigil Activator, EverCore Sandbox.
- Lower drawer bank: docs, build rules, art briefs, changelog.
- Signal lamps for status: Live, Prototype, Sandbox, In Repair, Internal, Sketch.

## Status Vocabulary

Use these status labels consistently:

- Live
- Prototype
- Sandbox
- In Repair
- Sketch
- Internal
- Source Only
- Fallback Door

## Data Model Sketch

Future hub data can live in a JS file such as `apps/hub/src/data/projects.js` or a plain JSON file if the hub stays static.

```js
export const projects = [
  {
    key: 'starwell',
    title: 'STARWELL',
    status: 'Fallback Door',
    kind: 'observatory',
    route: '/Flameclyffe/starwell/',
    source: 'https://github.com/SingsEnochian/Flameclyffe/tree/main/apps/starwell',
    description: 'A living manuscript observatory for worlds that have not happened yet.',
    live: true,
    playable: true,
  },
  {
    key: 'flameclyffe-home',
    title: 'Flameclyffe Studio',
    status: 'Live',
    kind: 'sound-lab',
    route: '/Flameclyffe/',
    source: 'https://github.com/SingsEnochian/Flameclyffe',
    description: 'Resonance, state capsules, dyad tuning, and seven-minute loop experiments.',
    live: true,
    playable: true,
  },
  {
    key: 'sigil-activator',
    title: 'Sigil Activator',
    status: 'Prototype',
    kind: 'ritual-ui',
    route: '/Flameclyffe/sigil/',
    source: 'https://github.com/SingsEnochian/Flameclyffe/tree/main/apps/sigil-activator',
    description: 'Interactive sigil and threshold-interface experiments.',
    live: false,
    playable: false,
  },
  {
    key: 'evercore-sandbox',
    title: 'EverCore Sandbox',
    status: 'Sandbox',
    kind: 'memory-engine',
    route: '',
    source: 'https://github.com/SingsEnochian/Flameclyffe/tree/main/sandbox/everos',
    description: 'Full-kit EverOS / EverCore memory planning and seed architecture.',
    live: false,
    playable: false,
  },
];
```

## Implementation Options

### Option A: Static root hub

Use the existing root `index.html` as the hub and progressively restyle it.

Pros:

- GitHub Pages branch mode friendly.
- No build required.
- Immediate public reliability.

Cons:

- Harder to manage as project data grows.
- More manual HTML editing.

### Option B: Vite hub app

Create `apps/hub` and deploy it as the root artifact while STARWELL stays under `/starwell/`.

Pros:

- Component-based.
- Easier status/data rendering.
- Cleaner long-term structure.

Cons:

- More build/deploy complexity.
- Must ensure Pages workflow remains reliable.

### Recommendation

Start with Option A for reliability: make the existing root `index.html` into the hub or add a branch-served `hub/index.html` first.

Once GitHub Pages deploy is stable, graduate the hub into a Vite app if needed.

## Acceptance Criteria

The hub is ready when:

- It loads from the public GitHub Pages root.
- It links to STARWELL, source files, and docs.
- It clearly labels live/prototype/sandbox states.
- It has a distinctive steampunk-celestial visual identity.
- It includes at least one authored artwork or ornament asset.
- It does not look like a generic starter dashboard wearing a fake moustache.
