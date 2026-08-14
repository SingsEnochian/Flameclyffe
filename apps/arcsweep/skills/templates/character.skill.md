---
skill_type: character
skill_id: replace-me
version: 2
status: draft
world_id: replace-me
character_id: replace-me
learning: append-with-provenance
compiled_from_cells: true
---

# Character Skill

This file is a human-readable entrypoint over a character cortex. Source documents and provenance-bearing cells remain authoritative. Do not turn this file into the only copy of character identity or continuity.

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

Identity claims should normally compile from `identity` cells rather than being silently rewritten here.

## Voice

- Vocabulary:
- Register:
- Sentence shape:
- Rhythm/cadence:
- Favourite constructions:
- Avoided constructions:
- Swearing/exclamations:
- Humour:
- Silence/body-language habits:

Dialogue observations remain provisional until supported by repeated scenes or promoted against canon.

## Mind and perception

- What this character notices first:
- Sensory preferences:
- Emotional tendencies:
- Core wants:
- Core fears:
- Contradictions:
- Moral/ethical pressures:

## Knowledge boundary

Character knowledge is not world knowledge. Every important knowledge claim should have chronology.

### Knows

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

### Does not know

- Fact withheld from this character:
- Relevant time range:
- Who may know instead:

### Must not know yet

Use explicit temporal gates. A narrator, model, or other character knowing something does not grant it to this character.

- Fact:
- Gate/event after which it becomes knowable:
- Source:

## Relationships

Relationship cells represent this character's side of the relationship unless the source explicitly supports a reciprocal fact.

- 

## Abilities and limitations

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

Do not overwrite an earlier state. Close its validity window and append the later state.

## Continuity anchors

- 

## Roleplay rules

Define what the character may initiate, how consent/agency is handled, and any scene-specific boundaries.

## Stable core

Stable core is Steward/canon-controlled. Models may use it but may not silently rewrite or promote into it.

- 

## Learned in play and prose

Authorised voices may propose `model_observation` cells about speech, behaviour, relationships, and continuity. These observations must retain:

- observing voice/model route
- timestamp
- world/document/scene scope
- source passage or request receipt
- provisional status
- review/promotion state

A model observation cannot grant the character knowledge retroactively and cannot outrank canon or user-confirmed cells.

### Entry template

- Timestamp:
- Observing voice/model route:
- World/document/scene:
- Story date / chronology point:
- Source passage/reference:
- Observed speech/behaviour/relationship/continuity cue:
- Confidence/status:
- Steward promotion status: unreviewed
