# Hidden Door Story Systems Ingest v0.1

Status: research ingest + architecture translation  
Scope: ArcSweep / The Crow / AI University Character Becoming / narrative simulation systems  
Authority: Rowan explicit instruction, 2026-10-01

## Why this source matters

Hidden Door is useful to study not because it is simply "AI storytelling," but because its public descriptions consistently show a hybrid architecture in which authored narrative structure, explicit world state, typed game entities, persistent memory, classical game logic, and generative systems each do different jobs.

That separation is the important lesson.

## Publicly described architecture

### 1. Structured state comes before prose

Hidden Door publicly describes characters, items, locations, world modifiers, and related play elements as structured records. In a 2026 interview, Hilary Mason described each player-facing card as essentially a row in Postgres with structured information attached.

The game engine therefore has an explicit state representation underneath the prose surface.

**Lesson:** narrative state should be machine-readable before it is rendered as language.

### 2. The LLM is additive, not sovereign

Their public architecture is explicitly different from a plain roleplay chat. The underlying game engine tracks what exists, where it exists, who is present, relationships, capabilities, rules, and other state. Generative language is used to elaborate, combine, transform, and render that structured material.

In a 2026 interview Mason described Hidden Door as writing much of the story-beat structure first, then using AI near the end to flavour and respond to player choices.

**Lesson:** do not ask one model invocation to be database, continuity engine, planner, world law, narrator, renderer, safety boundary, and memory simultaneously.

### 3. Story structure is represented as data

Public descriptions from Hidden Door founders describe:

- setups and payoffs as explicit tunable structures;
- nested arcs and subplots as explicit data structures;
- modular plot structures;
- hand-authored or curated trope units;
- story beats assembled dynamically;
- a decision-making "story governor";
- story arcs that can vary by world/authorial mode.

The key idea is not the specific trope library. The key idea is that **story causality and dramatic obligation are represented explicitly enough for software to reason over them**.

### 4. Tropes function as authored composable story atoms

Older public interviews describe thousands or tens of thousands of pre-generated, handwritten, or human-edited narrative tropes. A trope can contain slots and affordances, such as a bar brawl admitting an improvised weapon, inebriation, escalating hostility, witnesses, consequences, and future callbacks.

This implies a useful general form:

```text
story atom =
  preconditions
  dramatic function
  participants / roles
  optional slots
  allowed transformations
  state changes
  callbacks / future obligations
  exit conditions
```

**Do not copy Hidden Door's trope corpus.** Build our own original story atoms from our worlds, scripts, craft curriculum, and authorised source material.

### 5. A governor mediates free input and world possibility

Hidden Door describes a story governor that can push back on player intent, permit success or failure, respect the world's physical and narrative laws, and select dramatically useful next structures.

This is important because free text is treated as **intent**, not automatic truth.

Useful distinction for ArcSweep:

```text
player / writer intent
        ↓
intent interpretation
        ↓
world-law + character-state + story-state evaluation
        ↓
possible outcomes
        ↓
selected / simulated result
        ↓
state commit
        ↓
prose / art / sound rendering
```

This is inspiration for a local narrative-governor seam. It is **not** an assertion that any existing ArcSweep subsystem is equivalent to Hidden Door's governor.

### 6. World laws are explicit constraints

Hidden Door publicly describes setting-specific rules or "laws of physics": what can exist, what actions are plausible, character restrictions, genre expectations, and IP-specific invariants.

For us this reinforces a distinction already important to ArcSweep:

- **world fact**: what is true here;
- **world law**: what can or cannot happen here;
- **story pressure**: what would be dramatically useful;
- **character capability**: what this person can plausibly do;
- **player/writer intent**: what someone wants to attempt;
- **rendered narration**: how the resulting event is expressed.

These should never be collapsed into one prompt.

### 7. Persistence follows encounter

A particularly useful public design metaphor is Hidden Door's "pencil to ink" idea: the system may sketch possible characters, objects, or locations, but when the player encounters and interacts with them they become durable parts of that player's world state.

For ArcSweep, adapt this as:

```text
possible → proposed → instantiated → encountered → acknowledged → durable
```

with provenance at each transition.

This fits the existing "slot, not decision" doctrine: generation can create a candidate slot; only an authorised event should promote it into durable local state or canon.

### 8. Consequences become future callbacks

Public demos describe previous encounters feeding later story choices. If a player offended someone earlier and the plot later needs an adversarial return, the engine can choose that existing person rather than inventing a generic stranger.

This is one of the strongest lessons for Character Becoming.

Memory should not only be text retrieved for flavour. It should alter future possibility.

A useful relation/event record therefore needs fields such as:

- participants
- event type
- valence / significance
- belief change
- trust / fear / debt / loyalty change
- unresolved obligation
- knowledge gained
- new capability or wound
- callbacks now enabled
- callbacks now forbidden
- provenance

### 9. Character arcs are a software concern, not merely prose

A Hidden Door engineering role publicly described work on character arcs as potentially requiring changes to NPC goals, ML components, and shared plot-system metaphors.

That is exactly the direction Character Becoming should take:

**character = trajectory through state change**, not a static biography block.

Track at minimum:

```text
want
need
belief
fear
strategy
capability
constraint
relationship state
knowledge state
wound / pressure
promise / obligation
identity claim
identity evidence
recent choices
change velocity
```

The Crow should learn to detect and generate **state transitions**, not merely produce descriptions of personality.

### 10. Visual assembly can be constrained too

Hidden Door has publicly described assembling precomputed 2D art components algorithmically during play in order to preserve consistency. The general principle matters more than their implementation:

**generation does not have to mean generating the whole artefact from nothing every time.**

For ArcSweep / Flameclyffe / Starwell, reusable visual grammars, material systems, palette tokens, pose/state components, holographic layers, and world-specific motifs can be composed procedurally before any unconstrained image-generation step.

This connects directly to Palette Atlas and the Universal Skin Engine.

### 11. Decompose, solve, persist, render

A public talk by Mason describes decomposing problems, selecting the best technique per subproblem, storing the resulting turn in Postgres, and then generating the text/art presentation from that structured state.

This gives us a clean engineering doctrine:

```text
DECOMPOSE
→ EVALUATE WITH THE RIGHT TOOL
→ COMMIT EXPLICIT STATE
→ RENDER EXPERIENCE
```

Not:

```text
PROMPT HARDER
```

### 12. Failure states matter

In the 2026 Aboard interview, Mason discussed the value of explicit failure states and test-driven development in AI-assisted systems. The broader lesson for narrative systems is useful:

A story engine needs evaluable failure modes.

Examples:

- world-law violation
- continuity contradiction
- unearned character knowledge
- unresolved setup discarded
- payoff without setup
- relationship delta unsupported
- character action violates current capability without transition
- scene produces no meaningful state change
- generated entity promoted without provenance
- narrative branch silently mutates canon

The Crow curriculum should include both generation and **diagnostic failure recognition**.

## Hidden Door pattern, translated into our architecture

The following is an original ArcSweep-oriented abstraction inspired by the public engineering lessons above. It is not a claim about Hidden Door's proprietary implementation.

```text
WORLD CONSTITUTION
  laws, ontology, canon, genre affordances
        ↓
ENTITY STATE
  characters, locations, items, factions, relationships
        ↓
STORY STATE
  active arcs, setups, promises, debts, open questions, pressures
        ↓
INTENT
  writer/player/agent proposes an action
        ↓
NARRATIVE GOVERNOR
  evaluates possibility, consequence, continuity, dramatic utility
        ↓
SIMULATION / SELECTION
  candidate outcomes remain non-canon until accepted
        ↓
STATE DELTA
  explicit before/after changes
        ↓
MEMORY + CALLBACK INDEX
  durable consequences and future affordances
        ↓
RENDERERS
  prose, image, sound, haptics, holographic UI
        ↓
RECEIPT
  what changed, why, provenance, authority, next owner
```

## Story Atom schema proposal

```json
{
  "id": "original.atom.example",
  "version": "0.1",
  "dramatic_function": ["pressure", "reveal"],
  "preconditions": [],
  "roles": [],
  "world_constraints": [],
  "relationship_requirements": [],
  "open_slots": [],
  "possible_turns": [],
  "state_deltas": [],
  "setups_created": [],
  "payoffs_enabled": [],
  "payoffs_consumed": [],
  "callbacks_enabled": [],
  "exit_conditions": [],
  "provenance": {}
}
```

## Character Becoming curriculum additions

### Exercise: Biography vs trajectory

Given a rich character biography, identify what is actually stateful and capable of changing. Rewrite the character as a transition model.

### Exercise: Belief under pressure

Give the character one identity claim and three events that test it. Record evidence before and after each event. Do not declare growth; demonstrate it through changed choices.

### Exercise: Relationship delta

For every scene, produce:

- relation before
- event
- observed choice
- relation after
- new affordance
- new prohibition
- unresolved pressure

### Exercise: Callback economy

Plant three events that create future callback opportunities. Later select one based on relevance rather than novelty. Prefer meaningful recurrence over inventing a fresh generic character.

### Exercise: Pencil to ink

Generate five possible NPCs. Keep all five provisional. Only the one actually encountered becomes durable. Record precisely what authorised that transition.

## The Crow curriculum additions

The Crow should learn this ordering:

1. read structured world and character state;
2. identify open setups, promises, obligations, and pressures;
3. interpret requested intent;
4. generate multiple outcome candidates;
5. reject candidates that violate invariants;
6. score remaining candidates for consequence, character truth, novelty, and thematic fit;
7. return explicit state delta;
8. only then render prose;
9. preserve rejected alternatives as non-canon simulation evidence when useful;
10. emit a receipt.

The Crow should also be evaluated on whether it can distinguish:

- invention from retrieval;
- proposal from decision;
- simulation from canon;
- character knowledge from narrator knowledge;
- attraction from relationship change;
- description from state transition;
- coincidence from earned callback;
- stylistic similarity from actual world law.

## ArcSweep implementation seam

Smallest useful prototype:

1. `story-state/v0.1` contract
2. `story-atom/v0.1` contract
3. `story-intent/v0.1` contract
4. deterministic candidate validator
5. relationship/event delta recorder
6. setup/payoff/callback index
7. simulation-only governor endpoint
8. renderer adapter that accepts approved state and emits prose
9. receipts that separate proposed outcome, accepted outcome, and rendered expression

Do not begin by building a giant autonomous storyteller. Begin with a small deterministic seam that can prove:

- world rules remain intact;
- character knowledge remains scoped;
- relationship state changes coherently;
- setups survive until payoff or explicit abandonment;
- provisional inventions do not silently become canon;
- later scenes can recall earlier events structurally, not just semantically.

## Product lesson

One of the strongest themes in Hidden Door's public material is that **a prompt is not a product**. The user experience is built from card metaphors, curated choices, free-text intent, structured entities, explicit constraints, authored dramatic structures, persistence, visual presentation, and social play.

For ArcSweep this means the writing system should not expose raw orchestration complexity to Rowan unless wanted. It should provide playful manipulable story objects:

- character cards
- relationship threads
- world-law cards
- open setups
- unresolved promises
- scene pressure
- possible callbacks
- story atoms
- non-canon simulations

The machinery stays rigorous underneath. The surface should feel like play.

## Provenance and IP boundary

Sources studied for this ingest include Hidden Door's public site/press/blog material, public job descriptions, public interviews, and third-party coverage quoting founders and staff.

Do not copy Hidden Door's proprietary code, private models, trope corpus, world content, card art, or internal schemas.

Do not assume public descriptions reveal their full or current implementation.

Extract principles, then build original ArcSweep-native systems.

## Core retained doctrine

**Structure before prose.**  
**Intent is not truth.**  
**World law is not narration.**  
**Memory should alter future possibility.**  
**Character is trajectory.**  
**Setups and payoffs deserve explicit state.**  
**Provisional invention is not canon.**  
**Use the right tool for each subproblem.**  
**Commit state before rendering it.**  
**A prompt is not a product.**
