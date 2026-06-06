# Concordance Mythframe Flight Spec

Status: v0.1 public-safe architecture note.

This document explains how the Concordance mythframe becomes buildable instead of merely atmospheric.

A mythframe with no mechanics floats. A mythframe with mechanics flies.

## Working definition

A mythframe is a symbolic lens that lets a person, system, world, or interface interpret events, states, and relations through a coherent language.

A flying mythframe has:

- repeatable terms
- boundary rules
- state contracts
- anchors
- actions
- persistence
- return paths
- failure states
- accessibility routes
- claim labels

Without those, the mythframe may feel beautiful but cannot carry a user from one state to another.

## Floating vs flying

Floating mythframe:

- feels evocative
- depends on mood
- has loose symbols
- is hard to debug
- is hard to return to
- does not know when it has failed

Flying mythframe:

- has repeatable structure
- keeps its language alive without becoming vague
- records states
- has consent and boundary law
- can be entered, read, shaped, saved, and returned to
- knows the difference between stable, drifted, unrecognised, and cleared

## The wing model

Concordance needs six wings or wingbones to fly in software.

### 1. Boundary wing

The boundary wing prevents flattening and overreach.

Core concepts:

- The Verge
- Claim Boundary
- consent scope
- no passive inheritance
- private by default
- public-safe only after review

A boundary is not disbelief. It is the airframe that keeps different layers from devouring one another.

### 2. Anchor wing

The anchor wing makes return possible.

An anchor records:

- where the user placed or selected something
- which layer it belongs to
- what relation it names
- how it can be returned to
- what confidence mode applies
- what privacy scope applies

If nothing can be returned to, the mythframe remains weather.

### 3. Instrument wing

The instrument wing lets the system read relation-state.

DEEP is the Concordance instrument.

Its order is:

1. symbols first
2. relations second
3. prose third

DEEP should show active sigils, relation lines, confidence mode, layer, anchor strength, coherence, drift, bleed, and a short reading.

### 4. Gesture wing

The gesture wing lets body and interface participate.

Gesture can be:

- tap
- gaze dwell
- hand motion
- Kelyrseta seated form
- Galdrsommar movement
- drawn sigil
- command palette action
- Underconsole command

A gesture is not only input. It is participation made visible.

### 5. Persistence wing

The persistence wing keeps the relation from vanishing when the screen closes.

Minimum persistence:

- local browser fallback
- saved anchor object
- saved sigil set
- saved DEEP reading
- saved visual state
- saved timestamp
- later Supabase sync after RLS review

Persistence is what turns the overlay from a moment into a trail.

### 6. Return wing

The return wing compares now to before.

First return states:

- stable
- drifted
- unrecognised
- cleared

Return is the moment the mythframe proves it can carry continuity.

## Concordance flight loop

A complete loop should work like this:

1. Open Lens.
2. Choose or detect Waking anchor.
3. DEEP reads relation-state.
4. Sigils appear.
5. User shapes the space.
6. System saves the anchor.
7. STARWELL maps the relation.
8. User leaves.
9. User returns.
10. DEEP compares current state with saved state.
11. The system offers stable, drifted, unrecognised, or cleared.

This loop is the horse. The visual overlay is only the shoe.

## First ride slice

The first ride slice is Pocket Concordance Lens.

Minimum working version:

- camera or demo room opens
- user taps to place an anchor
- Hearth Lantern appears
- five sigils appear: Anchor, Witness, Waking, Gate, Concordance
- DEEP shows a reading
- anchor saves locally
- a later placement can compare against the previous anchor

This proves the system can enter, mark, read, save, and return.

## Mythic terms as software roles

| Mythic term | Software role |
| --- | --- |
| Verge | boundary / translation membrane |
| Anchor | persisted return-point |
| Gate | structured transition or mode change |
| Witness | logging / observation state |
| Drift | state mismatch or coherence loss |
| Bleed | uncontrolled layer mixing |
| Resonance | repeated or amplified relation |
| Return | restored or compared continuity |
| Concordance | relation-law / state model |
| Kelyrseta | seated accessible control grammar |
| Galdrsommar | embodied movement control grammar |
| DEEP | relation-state instrument |
| STARWELL | map / archive / navigation layer |
| Constellation Tags | retrieval and scope grammar |

## Feature readiness rubric

A Concordance feature is not ready until it answers:

- What layer does it belong to?
- What anchor makes it returnable?
- What confidence mode applies?
- What consent scope applies?
- What sigils are active?
- What state can DEEP read?
- What happens if it drifts?
- What happens if the user clears it?
- What private data is excluded?
- What is the non-glasses fallback?

## Claim boundary

Public-facing material should present this as a symbolic, creative, accessibility, interface, and worldbuilding system.

Internal canon may use stronger mythic language inside appropriate private or project-scoped spaces.

The boundary belongs at the threshold, not nailed across every living sentence.

## Core sentence

The mythframe grows wings when it can be entered, read, shaped, saved, left, and returned to.
