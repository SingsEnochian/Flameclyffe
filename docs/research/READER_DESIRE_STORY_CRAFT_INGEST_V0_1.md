# Reader-Desire Story Craft Ingest v0.1

Status: research ingest + curriculum translation  
Scope: The Crow / AI University Character Becoming / ArcSweep narrative systems  
Authority: Rowan explicit instruction, 2026-10-01  
Primary source: Katri Soikkeli, “How to write stories that people want to read”  
Source URL: https://katrisoikkeli.com/stories-people-want-to-read/

## Why this source matters

This source is useful because it separates **concept appeal** from **story substance**. A premise can attract attention, but the story must fulfil the promise that premise creates. That distinction is highly compatible with the Story Systems and Narrative DNA work already in progress.

The retained lesson is not “chase trends.” It is: understand what experience a reader expects from a concept, then deliver that experience with character truth, emotional consequence, meaningful problems, and sustained curiosity.

## Core doctrine

### 1. Concept and story are different jobs

A concept answers questions such as:

- what is this about?
- who is involved?
- what kind of world is this?
- what genre / tone / experience is being promised?
- what makes this immediately legible or intriguing?

The story then has to justify the invitation.

Useful distinction:

```text
concept = invitation / promise
story = lived fulfilment of that promise
plot = selected chain of events that carries the fulfilment
```

A striking concept without substance creates disappointment. A strong story hidden behind an unreadable or inert concept may never receive a chance.

### 2. Familiarity is not failure

Readers often seek recurring forms, archetypes, relationship structures, settings, and genre experiences because they already know what kind of pleasure those forms can provide.

The useful question is not “has this ever been done?” but:

**what do people actually love about this pattern?**

Do not copy the surface marker. Extract the underlying desire.

Example distinction:

```text
enemies-to-lovers surface = two people argue, then become romantic
underlying engine = antagonistic interpretation + forced attention + revised model of the other + earned trust + attraction under conflict
```

The Crow should learn to identify the engine beneath the label.

### 3. Familiar + changed can create legible novelty

Two useful concept-combination operators are:

```text
X, but with a meaningful difference
X meets Y
```

The difference must change causality, character experience, theme, or world logic. Cosmetic remixing is not enough.

Curriculum question:

> What becomes newly possible, newly difficult, or newly meaningful because of the changed ingredient?

### 4. Reader promise must be paid

If the concept advertises a specific emotional or narrative experience, the story must actually contain it in developed form.

Examples:

- a “dangerous heroine” must have consequential choices, not merely abrasive dialogue;
- a romance must demonstrate why the pair matters to each other and what they choose or risk for the relationship;
- a political thriller must contain real pressure, information asymmetry, competing goals, and consequence rather than decorative institutions;
- a mythic quest must transform the traveller rather than simply move them through scenic checkpoints.

This becomes a **promise/payoff audit** in ArcSweep.

### 5. Characters make events matter

Plot events become compelling through what they mean to particular people.

Useful model:

```text
event significance = external consequence × personal meaning × future change
```

The same explosion, betrayal, wedding, discovery, or death can be inert or devastating depending on the character-state around it.

The Crow should therefore ask:

- why does this matter to this character?
- what do they fear losing?
- what belief or relationship does this event pressure?
- what becomes harder or impossible afterward?

### 6. Emotion is part of the product

Stories are remembered partly through the feelings they reliably create. A work can therefore have an **emotional signature** in addition to genre and tone.

Possible signatures include combinations such as:

- ache + hope
- dread + curiosity
- tenderness + danger
- grief + wonder
- rage + release
- comfort + yearning

This is not an instruction to force emotion mechanically. It is a design question:

> What experience do readers return to this story to feel again?

That question belongs in Narrative DNA analysis.

### 7. Universal meaning needs specificity

Broad themes become durable when expressed through specific people, conflicts, cultures, bodies, habits, objects, places, and consequences.

Do not write “identity” in the abstract. Build a character whose identity becomes difficult to inhabit under particular pressures.

Do not write “family” in the abstract. Show exactly what this family remembers, withholds, repeats, cooks, inherits, fears, forgives, or cannot forgive.

Useful principle:

**Specificity is the delivery mechanism for universality.**

### 8. Separate timely furniture from timeless pressure

Contemporary technology, slang, platforms, products, and institutions can locate a story in time. They are not inherently a weakness.

The deeper test is whether the story contains durable human pressures underneath them:

- belonging
- ambition
- grief
- shame
- love
- identity
- power
- loyalty
- freedom
- mortality
- responsibility
- envy
- forgiveness

ArcSweep should be able to distinguish **era markers** from **load-bearing human questions**.

### 9. Problems must be locally important

A problem need not matter to every reader personally. It must be clear why it matters to the character living through it.

Represent problem salience with:

```text
problem
who experiences it
what they stand to lose
why they cannot simply ignore it
why easy solutions fail
what the problem pressures internally
what relationships it disturbs
what new questions it creates
```

This prevents “so what?” plot events.

### 10. Curiosity should stack

A strong story can open a large central question while continually creating and resolving smaller overlapping questions.

Do not treat mystery as a single locked box that remains closed until the finale.

Useful model:

```text
central question
  + active secondary question A
  + active secondary question B
  - partial answer A
  + new consequence question C
  + reinterpretation of central question
  ...
  → earned closure
```

Questions should overlap. Answers should frequently produce consequences rather than simply erase curiosity.

This can be implemented as a **question stack** alongside setup/payoff/callback state.

## The Crow training exercises

### Exercise A — Trope autopsy

Given a trope label, identify:

1. common surface markers;
2. the reader desire underneath them;
3. the causal relationship mechanics;
4. common shallow imitations;
5. three original implementations that preserve the engine without copying expression.

### Exercise B — Concept vs story

Given a high-concept premise, write two columns:

- what the premise promises;
- what the actual story must do to fulfil that promise.

Flag promises with no planned payoff.

### Exercise C — Promise/payoff audit

For a draft or world pitch, extract every implied promise from title, genre, premise, tone, relationship setup, mysteries, powers, and stated player fantasy.

Mark each as:

- unplanted
- planted
- developing
- partially paid
- paid
- intentionally denied / subverted
- abandoned with reason

### Exercise D — Emotional signature

Identify the three strongest recurring feelings a story creates. Verify them against actual scenes rather than author intention alone.

Then ask whether the emotional signature is monotonous, contradictory in a useful way, or missing from the advertised concept.

### Exercise E — Question stack

Map all currently active reader questions. Check whether:

- there is at least one load-bearing central question;
- smaller questions overlap rather than queue one-by-one;
- answers create consequences or reinterpretations;
- forgotten questions are intentionally abandoned rather than accidentally dropped.

### Exercise F — Specificity to universality

Take an abstract theme and generate a concrete embodiment through:

- one character choice;
- one relationship conflict;
- one object;
- one recurring habit;
- one setting pressure;
- one irreversible consequence.

### Exercise G — Timelessness audit

Separate current-era furniture from durable human stakes. If removing the brand/platform reference collapses the story, determine whether that dependence is intentional.

## ArcSweep implementation seam

Add reader-experience fields to story-state and narrative-analysis contracts:

```text
concept_promise
reader_fantasies
emotional_signature
problem_salience
question_stack
promise_payoff_index
trope_engine
specificity_anchors
timeless_pressures
```

These are analytical and design aids, not automatic quality scores.

The system should surface mismatches such as:

- advertised relationship with no relational development;
- advertised danger with no meaningful cost;
- advertised mystery with no question architecture;
- repeated spectacle with no character consequence;
- trope label present but trope engine absent;
- concept novelty that changes aesthetics but not causality;
- thematic abstraction with no specific embodiment.

## Connection to current Narrative DNA doctrine

This source strengthens several existing rules:

- detect the engine beneath recurring surface patterns;
- distinguish attractor from obligation;
- treat relationship change as state change;
- require scenes to alter information, intention, relation, position, resources, danger, obligation, possibility, or interpretation;
- learn why something works before generating more of it;
- preserve the writer’s agency over what becomes canon.

## Provenance boundary

Katri Soikkeli’s article is retained as an external craft source. Do not copy article prose, examples, products, templates, or paid materials into local corpora.

Extract principles, preserve attribution, and generate original exercises and implementation contracts.

## Core retained doctrine

**Concept is a promise.**  
**Story pays the promise.**  
**Learn the desire beneath the trope.**  
**Events matter through characters.**  
**Emotion is part of reader experience.**  
**Specificity carries universal meaning.**  
**Problems must matter locally.**  
**Curiosity should stack.**
