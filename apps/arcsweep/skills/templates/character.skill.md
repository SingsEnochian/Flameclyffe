---
skill_type: character
skill_id: replace-me
version: 3
status: draft
world_id: replace-me
character_id: replace-me
learning: append-with-provenance
compiled_from_cells: true
---

# Character Skill

This file is a human-readable entrypoint over a character cortex. Source documents and provenance-bearing cells remain the durable authority beneath it.

## Source document registry

Record the actual materials from which character cells may be extracted.

- Canon/Wiki profile:
- Timeline/chronology:
- Scenes and chapters:
- Dialogue samples:
- Relationship records:
- World-law documents:
- Steward corrections:
- Approved external canon sources:

For each source track locator, authority, privacy, revision/hash when available, and whether it is canon, evidence, or observation.

## Identity

- Name:
- Aliases:
- Pronouns:
- Gender:
- Species/culture/nation:
- Occupation/role:
- Affiliations:
- Current era/date:

Identity claims normally compile from `identity` cells. Direct edits here should be converted into provenance-bearing source or cell changes.

## Voice

- Vocabulary:
- Register:
- Sentence shape:
- Rhythm/cadence:
- Favourite constructions:
- Constructions that feel off-register:
- Swearing/exclamations:
- Humour:
- Silence/body-language habits:

Dialogue observations remain provisional until repeated scenes or explicit canon promotion support them.

## Mind and perception

- What this character notices first:
- Sensory preferences:
- Emotional tendencies:
- Core wants:
- Core fears:
- Contradictions:
- Moral/ethical pressures:

## Knowledge boundary

Character knowledge is a chronology-valid set distinct from world, narrator, model, and other-character knowledge.

### Knows now

For each durable item record, where possible:

- Fact:
- Learned at / valid from:
- Source scene or event:
- Certainty:

### Suspects

- Fact or hypothesis:
- First suspected at:
- Evidence available to the character:
- Confidence:

### Unknown to this character

- Fact currently outside this character's knowledge:
- Relevant time range:
- Other subjects that may carry the fact:

### Knowledge gates / learns later

Use explicit temporal or story-order gates. Narrator, model, source, and other-character knowledge remain in their own subjects until an in-story event makes the fact available to this character.

- Fact:
- Gate/event after which it becomes knowable:
- Source:

## Relationships

Relationship cells represent this character's side of the relationship unless the source explicitly supports a reciprocal fact.

- 

## Abilities, constraints, and conditions

Describe capability and its current conditions precisely. Prefer concrete gates, costs, injuries, training states, consent rules, or environmental constraints over generic diminishment language.

- 

## Current state

Compile from `character_state` cells scoped to the active date/scene.

- Present state:
- Active tensions:
- Recent changes:
- Open threads:

## Chronology

Use `chronology` and temporally-scoped cells for:

- births/ages/life stages
- travel/location
- injuries/healing
- relationship changes
- knowledge acquisition
- role/status changes
- promises, debts, vows, discoveries

Earlier states remain provenance. Close their validity window and append the later state rather than overwriting history.

## Continuity anchors

- 

## Roleplay rules

Define what the character may initiate, how consent/agency is handled, and any scene-specific boundaries.

## Stable core

Stable core is Steward/canon-controlled. It remains available to models for context while promotion into or revision of stable core stays an explicit reviewed action.

- 

## Learned in play and prose

Authorised voices may propose `model_observation` cells about speech, behaviour, relationships, and continuity. These observations retain:

- observing voice/model route
- timestamp
- world/document/scene scope
- source passage or request receipt
- provisional status
- review/promotion state

Character knowledge activates from its own chronology-valid cells. Model observations remain lower authority than canon and user-confirmed cells until deliberately promoted.

### Entry template

- Timestamp:
- Observing voice/model route:
- World/document/scene:
- Story date / chronology point:
- Source passage/reference:
- Observed speech/behaviour/relationship/continuity cue:
- Confidence/status:
- Steward promotion status: unreviewed
