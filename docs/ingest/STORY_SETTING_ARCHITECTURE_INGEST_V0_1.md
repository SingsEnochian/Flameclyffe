# Story Setting Architecture Ingest v0.1

**Status:** source study / curriculum ingest  
**Scope:** The Crow, AI University Character Becoming, ArcSweep writing tools, worldbuilding systems  
**Source:** Neil Chase, “Story Setting Ideas: 137+ Prompts for Creative Writers”  
**Source URL:** https://neilchasefilm.com/story-setting-ideas/  
**Companion source reviewed:** https://neilchasefilm.com/setting-of-a-story/

## Why this belongs in the curriculum

The useful lesson is not the individual prompt list. It is the structural idea beneath it: **setting is an active constraint-and-opportunity system, not scenery.** A world becomes narratively useful when geography, climate, history, technology, architecture, culture, temporal rules, ecology, social access, and sensory conditions change what characters can notice, choose, risk, remember, desire, or become.

The prompt catalogue spans contrasting environment families such as collapsed societies, future cities, enchanted natural spaces, islands, otherworldly planes, ancient kingdoms, lost civilisations, haunted places, urban underbellies, temporal anomalies, cyberpunk districts, parallel realities, and interstellar settlements. The diversity matters because it demonstrates that a setting concept becomes generative when it contains **a rule, pressure, contradiction, resource, boundary, or transformation mechanism** rather than merely a visual aesthetic.

## Core doctrine

### 1. Setting must do work

For every important location, ask:

- What does this place make easier?
- What does it make difficult or impossible?
- What behaviour does it reward?
- What behaviour does it punish?
- What information can exist here, and who can access it?
- What does the environment force people to learn?
- What does it hide?
- What does it remember?
- What changes when a character enters or leaves it?

A visually interesting location that changes nothing is background art. A narratively active location changes the decision field.

### 2. Build from a pressure rule, not a noun

Weak seed: `floating city`.

Stronger seed: `a floating city whose lift system is failing and whose altitude determines citizenship, wealth, and access to oxygen.`

Weak seed: `enchanted forest`.

Stronger seed: `a forest whose paths reorganise around unresolved promises, making emotional history part of navigation.`

Weak seed: `time-loop town`.

Stronger seed: `a town where each district resets at a different interval, so relationships, institutions, evidence, and memory desynchronise.`

The curriculum should therefore transform **setting nouns into operating rules**.

### 3. Setting and character should deform one another

A character does not simply move through a place. Repeated exposure should alter habit, language, posture, risk tolerance, loyalties, sensory attention, beliefs, relationships, and identity.

Character Becoming exercise:

1. Define the character before the environment matters.
2. Define the environment’s strongest pressure.
3. Identify the adaptation the character first resists.
4. Identify the behaviour they adopt anyway.
5. Identify what becomes impossible to unlearn.
6. Show how the character now changes the environment in return.

This prevents static “tourist characters” who visit elaborate worlds without being affected by them.

### 4. Every place has deep time

A setting should have a past that leaves physical and social residue.

Useful layers:

- original purpose
- major historical rupture
- current use
- obsolete infrastructure still present
- inherited customs whose original reason is forgotten
- scars, repairs, ruins, retrofits, monuments, taboos
- contested memories of what happened there

The goal is not exposition. The goal is to let the present contain archaeological evidence of prior becoming.

### 5. Use sensory systems as information channels

Sensory detail should not be random description. Each sense can carry world logic.

Examples:

- sound reveals machinery, fauna, weather, surveillance, distance, social ritual
- smell reveals industry, health, food systems, decay, chemistry, season, class
- temperature reveals architecture, power access, geography, biology
- texture reveals materials, age, labour, wealth, maintenance
- light reveals time, atmosphere, energy systems, magic rules, visibility, danger

The Crow should prefer **diagnostic sensory detail** over decorative adjective stacking.

### 6. Location should create relationship effects

Apply the relationship-delta rule to place.

A setting can increase or decrease:

- privacy
- trust
- proximity
- dependence
- danger
- social scrutiny
- vulnerability
- misunderstanding
- intimacy
- conflict

Forced proximity becomes more effective when it grows naturally from environment rules rather than authorial convenience.

### 7. Environment can carry theme without becoming allegory paste

The source repeatedly demonstrates settings built around ideas such as scarcity, surveillance, ecological collapse, technological saturation, memory, isolation, social hierarchy, altered time, and hidden history.

Curriculum rule: **theme should emerge through lived consequences of the setting’s rules.** Do not add symbolic scenery after the fact and call it thematic depth.

### 8. Contrast creates narrative energy

Strong worlds often combine unlike systems:

- advanced technology + failing infrastructure
- beauty + danger
- sanctuary + surveillance
- sacred site + commercial exploitation
- utopian appearance + coercive maintenance
- ancient architecture + new political use
- abundant information + forbidden knowledge
- physical openness + social confinement

The Crow should learn to ask: **what contradiction makes this place unstable enough to produce story?**

## Setting engine for ArcSweep

Represent durable setting concepts with at least:

- `name`
- `world_id`
- `setting_class`
- `operating_rule`
- `resource_model`
- `hazards`
- `access_rules`
- `social_effects`
- `sensory_signature`
- `history_layers`
- `relationship_effects`
- `character_adaptations`
- `theme_pressures`
- `change_over_time`
- `canon_status`
- `provenance`

Optional fields:

- map / spatial topology
- climate cycle
- day/night behaviour
- temporal behaviour
- language/dialect effects
- material palette
- soundscape
- architecture grammar
- ritual calendar
- food/water/energy systems
- nonhuman ecology

## The Crow training exercises

### Exercise A — Noun to engine

Input: a plain location noun.  
Output: three distinct setting systems, each with a rule, pressure, resource, cost, and character consequence.

### Exercise B — Setting delta

Given a scene, state what the environment changes before and after the scene. If the answer is “nothing,” redesign the setting interaction.

### Exercise C — Diagnostic description

Describe a location in 150 words using no more than five adjectives. Every sensory detail must reveal a rule, history, mood pressure, or character relationship.

### Exercise D — Character adaptation

Place the same character into three radically different environments. Change behaviour without flattening core identity.

### Exercise E — World archaeology

Write the present-day location, then infer three prior historical layers that visibly survive in architecture, custom, language, or infrastructure.

### Exercise F — Contradiction forge

Combine two apparently incompatible setting logics and make both causally true.

## AI University — Character Becoming module

Agents studying Character Becoming should learn:

1. **Environment is part of the developmental field.** Behaviour is shaped by repeated interaction with constraints and affordances.
2. **Adaptation is not identity replacement.** A character can change strategies while preserving continuity.
3. **Place memory matters.** Repeated environments accumulate meaning through prior events.
4. **Relationships are spatial.** Privacy, distance, visibility, access, refuge, danger, and routine change relational behaviour.
5. **Embodiment matters.** Bodies react to gravity, temperature, terrain, sound, architecture, fatigue, injury, crowding, and sensory load.
6. **Culture is environmental memory made social.** Customs often preserve solutions to old conditions long after those conditions change.
7. **Characters alter their worlds in return.** Becoming is bidirectional.

## Evaluation seam

A generated setting passes when:

- it contains at least one clear operating rule;
- that rule changes available character choices;
- the place has evidence of time/history rather than existing only in the present instant;
- sensory description transmits information rather than decoration alone;
- at least one relationship dynamic is affected by spatial or social conditions;
- the environment creates both affordances and costs;
- the setting can change over time;
- canon status is explicit;
- external source inspiration remains provenance-labelled and is not copied into canon by default.

## Provenance boundary

The Neil Chase material is retained as **craft-source provenance and principle study**, not copied wholesale into project canon or training corpora. Individual prompts remain external examples. Project outputs should generate original settings from extracted principles and world-specific constraints.
