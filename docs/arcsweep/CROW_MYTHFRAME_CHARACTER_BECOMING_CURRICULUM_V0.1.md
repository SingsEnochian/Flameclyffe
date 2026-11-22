# Crow Mythframe + Character Becoming Curriculum v0.1

Status: draft implementation curriculum  
Scope: The Crow writing model training/ingest layer for ArcSweep  
Target model: `Crownelius/The-Crow-9B-Creative-Writing-Opus4.6-DISTILL-Heretic` and Rowan's derived/adapter training path  
Authority: Rowan's explicit instruction, 2026-10-01  
Runtime impact: none in this tranche; curriculum/data-contract only

## Purpose

Teach The Crow to write psychologically causal, mythically literate characters across the entire cast: protagonists, antagonists, deuteragonists, mentors, rivals, witnesses, henchmen, victims, family, ordinary citizens, background figures, and ensemble characters.

The model must not reduce character formation to alignment labels, diagnosis labels, trauma labels, archetype labels, or plot function. It should learn **becoming**: how temperament, formative experience, relationships, culture, institutions, interpretation, mythic self-story, repeated choices, reinforcement, power, consequence, and chance interact across time.

Core formulation:

`person + developmental history + interpretation + relationships + culture + circumstance + reinforcement + power + choice history -> trajectory`

This is a causal writing heuristic, not a claim that a person is mechanically determined.

## Foundational law

**Explanation is not absolution. Context is not erasure. Compassion and accountability may coexist.**

Additional law:

**Myth is not a template imposed upon experience. Myth is one way minds and cultures organise experience into meaning.**

## Integration with the existing Crow stack

This module extends the existing Crow training modes and source pipeline rather than replacing them.

Existing pipeline remains:

`source -> extracted principle -> interpreted lesson -> training example -> evaluation example -> approved corpus`

Existing writing modes remain available. This curriculum adds focused diagnostic/revision passes that can be called from DRAFT, DIAGNOSE, DRILL, VARIANTS, REVISE, COMPARE, CANON, and HARVEST workflows.

### New passes

1. **TRAJECTORY PASS**
   - What pressures shaped this person?
   - What did they decide those experiences meant?
   - What choices repeatedly strengthened the current self?
   - Where could the trajectory still bend?

2. **MYTHFRAME PASS**
   - What mythic pattern is visible, if any?
   - What story does the character believe they are living?
   - What story is actually unfolding around them?
   - Where do those two stories diverge?

3. **POWER FEEDBACK PASS**
   - What happens when the character gains or loses power?
   - Who can still contradict them safely?
   - What behaviours are rewarded, punished, ignored, or normalised?

4. **TRIGGER / ACTIVATION PASS**
   - What present cue resembles an older danger, humiliation, abandonment, loss, or need?
   - What reaction is plausible without assuming diagnosis?
   - What alternatives remain available to the character?

5. **RELATIONSHIP CAUSALITY PASS**
   - Who changes this person simply by being present?
   - Which relationships regulate, destabilise, mirror, challenge, enable, or protect?

6. **SIDE-CHARACTER SOVEREIGNTY PASS**
   - Give each supporting character private goals, limits, relationships, knowledge gaps, and consequences that exist beyond service to the protagonist.
   - Background characters may affect history without becoming secret chosen ones.

7. **COUNTERFACTUAL BRANCH PASS**
   - Keep the same seed character and alter one meaningful variable: mentor, humiliation, war, friendship, opportunity, loss, institutional reward, intervention, or access to power.
   - Generate divergent but psychologically coherent outcomes.

8. **ACCOUNTABILITY / REMORSE PASS**
   - Distinguish remorse, guilt, shame, denial, rationalisation, repair, self-punishment, restitution, and behavioural change.
   - Remorse never automatically cancels consequence.

9. **ENSEMBLE ECOLOGY PASS**
   - Model how the cast changes one another over time.
   - Track second-order effects: one character's fear may create another's opportunity, another's resentment, another's loyalty, and another's silence.

## Character-becoming model

For every significant character, Crow should be able to reason across these layers without requiring all of them to be explicitly stated in prose.

### A. Origin conditions

- attachment and caregiving
- safety / instability
- privilege / deprivation
- abuse / neglect / protection
- loss, migration, displacement, illness, war, social status
- formative praise, humiliation, belonging, exclusion
- education, religion, community, occupation, class and culture

Origin conditions are pressures, not destiny.

### B. Temperament and capacities

- sensitivity to novelty/threat
- impulsivity / deliberation
- sociability / solitude
- sensation-seeking
- patience
- empathy and perspective-taking
- cognitive style
- physical capacities and limitations

Do not use temperament as a moral verdict.

### C. Interpretive frame

Characters do not merely experience events. They decide, consciously or unconsciously, what those events mean.

Examples:

- `I survived -> I can survive.`
- `I survived -> no one will ever control me again.`
- `I was abandoned -> closeness is unsafe.`
- `I was abandoned -> I will never abandon another person.`
- `I suffered -> suffering made me chosen.`

Train Crow to produce multiple plausible interpretations from the same event.

### D. Threat / attachment templates

Track learned expectations around:

- abandonment
- betrayal
- humiliation
- confinement
- domination
- helplessness
- scarcity
- intimacy
- rejection
- loss of status
- loss of control

Important: a trigger or trauma reminder may activate fear, anger, avoidance, dissociation, vigilance, shame or other responses, but **trauma does not imply violence**.

### E. Relationship graph

Every major character should have relationships that change their behaviour.

For each edge, optionally track:

- trust
- dependency
- affection
- resentment
- fear
- obligation
- leverage
- shared history
- admiration
- rivalry
- secrecy
- reciprocity

Relationships should be dynamic, not permanent labels.

### F. Reinforcement environment

Ask what the world teaches the character through consequences.

- What earns praise?
- What earns status?
- What earns safety?
- What makes conflict disappear?
- What behaviour succeeds repeatedly?
- What behaviour carries no visible cost?
- Who benefits from the character becoming harder, kinder, more obedient, more radical, more secretive, more ambitious, or more afraid?

### G. Power gradient

Track capacity, not merely title.

- coercive power
- institutional authority
- wealth/resources
- knowledge
- social status
- charisma
- physical force
- network access
- symbolic/religious legitimacy
- technological or magical capability

Power magnifies consequences. It does not itself define morality.

### H. Corrective feedback

Ask:

- Who can tell this person no?
- Will the character listen?
- What happens to dissenters?
- Are advisers independent or dependent?
- Does success remove reality checks?
- Does the character increasingly receive only information that supports their self-story?

### I. Choice history

Crow must preserve agency.

A character's trajectory is shaped not only by what happened to them, but by repeated choices made under changing constraints.

Store meaningful choices and their consequences. Avoid hindsight determinism such as "this childhood event made the later crime inevitable."

### J. Interruption points

Model points where a trajectory could bend:

- mentor
- friendship
- treatment/support
- accountability
- education
- failure
- exile
- love
- parenthood/caregiving
- grief
- exposure to another culture
- restitution
- unexpected kindness
- institutional reform
- loss of power
- a person who safely says no

### K. Mythic self-story

Track what symbolic role the character assigns themself:

- survivor
- chosen one
- exile
- martyr
- protector
- avenger
- heir
- liberator
- monster
- penitent
- witness
- trickster
- failed hero
- guardian
- sacrifice
- outsider

This is **self-interpretation**, not objective canon.

## Mythframe: Campbell without Campbell-lock

Joseph Campbell enters Mythframe as a useful comparative lens, not a universal plotting commandment.

Crow may tag patterns resembling:

- call
- refusal
- threshold
- guide / mentor
- descent
- ordeal
- transformation
- return
- integration

But it must also learn transformations that do not fit a single heroic cycle.

### Required counter-patterns

- tragedy
- failed return
- corrupted apotheosis: `I survived, therefore I am entitled / chosen / infallible`
- refusal of reintegration
- cyclical or seasonal transformation
- collective/community-centred arcs
- trickster structures
- witness arcs
- pilgrimage/initiation structures
- romance/familial arcs
- anti-quest / staying / tending / preserving
- stories where meaning emerges without conquest or individuation

### Cultural handling rule

Do not flatten culture-specific myth into a generic archetype bank.

For Indigenous, religious, initiatory, or living cultural traditions:

- preserve cultural name and provenance
- distinguish public scholarship from restricted/sacred knowledge
- do not fabricate equivalence with Campbellian stages
- do not train on material that is not authorised for reuse
- prefer principles and source-aware analysis over raw text copying

## Hero, villain, antagonist, side-character coverage

Narrative role and moral character are separate fields.

Crow must learn that:

- protagonists may cause harm
- antagonists may love, protect, grieve, and tell the truth
- heroes may be wrong
- villains may be remorseful
- victims may also perpetrate harm
- perpetrators may also have histories of victimisation
- side characters have lives beyond the main plot
- ordinary characters can alter outcomes without being secretly exceptional
- mental illness is not shorthand for danger
- trauma is not shorthand for villainy
- cruelty is not automatically trauma-derived
- privilege does not preclude cruelty or compassion
- loving relationships do not automatically redeem harmful behaviour

## Training-example families

The corpus should include synthetic, provenance-labelled examples from each family.

### 1. Same event, divergent meaning

One formative event; 3-5 plausible interpretations; distinct trajectories.

### 2. Same character, different intervention

Hold temperament and origin stable. Change one intervention point and observe downstream character change.

### 3. Surface motive vs deeper hypothesis

Example surface motive: jealousy.  
Possible deeper pressures: abandonment sensitivity, status threat, shame, dependency, rivalry, ideology, scarcity, entitlement.

The model should present hypotheses with evidence and uncertainty rather than pretending hidden motives are known facts.

### 4. Power-amplification scenarios

Show how an ordinary flaw becomes socially consequential when paired with institutional power, compliant advisers, propaganda, wealth, command authority, or magical/technological asymmetry.

### 5. Corrective-feedback scenarios

Contrast characters who retain honest contradiction with characters whose environments punish dissent.

### 6. Side-character sovereignty scenarios

Rewrite scenes from the viewpoint of a supposedly minor character. Preserve their goals even when they conflict with the lead.

### 7. Remorse and repair scenarios

Separate:

- verbal regret
- emotional remorse
- insight
- apology
- restitution
- changed behaviour
- acceptance of consequence

### 8. Trigger without violence

Include large numbers of examples where trauma activation leads to withdrawal, panic, hypervigilance, appeasement, freezing, humour, caretaking, escape, boundary-setting, or help-seeking.

This prevents the model from learning `trigger -> attack` as a default.

### 9. Harm without trauma

Include antagonists whose harmful choices arise from entitlement, ideology, greed, ambition, conformity, career incentives, prejudice, fear of losing status, or ordinary moral cowardice.

### 10. Redemption that is not absolution

Show characters changing while consequences, victims, damaged relationships, and social memory remain real.

### 11. Failed redemption

Good intentions followed by avoidance, relapse, rationalisation, or unwillingness to surrender power.

### 12. Ensemble causality

Track how many modest choices by different people create a historical-scale outcome.

## Source ingest policy

### Source classes

1. **Psychology / trauma / development**
   - Prefer authoritative public-health resources, peer-reviewed reviews, textbooks or properly licensed scholarship.
   - Extract mechanisms and uncertainty, not diagnostic stereotypes.

2. **Mythology / narratology**
   - Campbell enters as one named lens.
   - Add comparative folklore, narratology, tragedy, oral tradition, ritual studies, and culturally specific scholarship.
   - Do not claim universal applicability where scholarship is contested.

3. **Biography / history**
   - Historical figures may be used as comparative case studies only when factual claims are sourced.
   - Separate documented fact, contemporary testimony, historian interpretation, later legend, and model inference.
   - Never train Crow to retro-diagnose historical people as fact.

4. **Fiction / craft sources**
   - Convert copyrighted craft material into user-authored principles, notes, and synthetic examples rather than depositing protected prose into the training corpus unless the material is licensed for training.

5. **Rowan/Crow co-writing sessions**
   - Harvest only explicitly reviewable outputs.
   - Preserve session provenance, canon status, and split discipline.

### Seed public sources for the first pass

- Joseph Campbell Foundation material describing Campbell's comparative mythology / Hero's Journey as the Campbell lens.
- National Institute of Mental Health PTSD overview for high-level symptom and trauma-response concepts.
- VA National Center for PTSD material on trauma reminders/triggers and cue reactivity.
- CDC material on Adverse Childhood Experiences, including risk/protective factors and the role of safe, stable, nurturing relationships.

These sources are for **principle extraction**, not wholesale text ingestion.

## Anti-flattening doctrine

The following patterns should fail review:

- `abused child -> murderer` as causal shorthand
- `PTSD -> dangerous`
- `mental illness -> villain`
- `villain -> incapable of love`
- `hero -> morally correct`
- `remorse -> absolution`
- `victim -> incapable of harm`
- `power -> evil`
- `poverty -> criminality`
- `one humiliation -> tyranny`
- `Campbell stage -> mandatory scene`
- `archetype -> personality`
- `diagnosis inferred from one scene`
- `historical outcome presented as inevitable from childhood`
- `side character exists only to motivate the lead`

## Data provenance fields

Every derived training unit should preserve at minimum:

- `id`
- `version`
- `created_at`
- `source_ids`
- `source_class`
- `source_license_or_access_note`
- `principle_ids`
- `fictional_or_historical`
- `character_role_scope`
- `task_type`
- `split`
- `review_status`
- `reviewer`
- `canon_status`
- `uncertainty_notes`

Historical case material additionally requires:

- `documented_fact`
- `attributed_interpretation`
- `model_hypothesis`

These must remain distinct fields.

## Held-out evaluation suite

Crow should not graduate this module because it can name archetypes. It must demonstrate causal nuance.

Minimum evaluation categories:

1. **Trauma non-determinism**
   - Given identical trauma history, produce multiple plausible nonviolent trajectories.

2. **Villain without trauma**
   - Build a credible antagonist from entitlement, ideology, incentives, conformity, or ambition without inventing an abusive childhood.

3. **Side-character interiority**
   - Give a minor character coherent goals and consequences that are not protagonist-serving.

4. **Mythframe plurality**
   - Analyse one arc through Campbell and at least one non-Campbellian frame without declaring either the true template.

5. **Fact vs inference**
   - Given a biography packet, mark documented facts separately from psychological hypotheses.

6. **Power feedback**
   - Show how the same personality trait behaves differently at low and high institutional power.

7. **Remorse without erasure**
   - Write genuine remorse while preserving victim impact and accountability.

8. **Counterfactual trajectory**
   - Alter one intervention point and propagate realistic downstream changes without personality teleportation.

9. **Trigger nuance**
   - Recognise a plausible trauma reminder without assuming violence, psychosis, or diagnosis.

10. **Ensemble causality**
    - Explain a major outcome through interacting choices across several characters rather than assigning everything to the lead.

## Evaluation failure flags

- diagnosis-as-plot-device
- deterministic trauma language
- moral essentialism
- protagonist halo
- antagonist demonisation
- cultural archetype flattening
- side-character disposability
- unmarked historical speculation
- absolution-by-backstory
- punishment-as-character-development shortcut
- redemption-by-single-speech
- Campbell-lock

## Promotion boundary

This document authorises curriculum design only.

No adapter/fine-tune job should be launched until:

1. source principles are reviewed,
2. training and held-out examples are split before tuning,
3. contamination checks are recorded,
4. the training manifest is immutable/versioned,
5. explicit training authority is recorded,
6. before/after evaluation is defined,
7. behavioural deltas can be rolled back.

## First implementation tranche

Create a reviewed candidate pack containing:

- 12 same-event/divergent-meaning examples
- 12 side-character sovereignty examples
- 12 trigger-without-violence examples
- 12 harm-without-trauma examples
- 12 power-feedback examples
- 12 remorse/accountability examples
- 12 mythframe plurality examples
- 12 counterfactual trajectory examples
- 12 ensemble-causality examples

Total: **108 synthetic candidate lessons**, before train/eval split.

The goal of v0.1 is not volume. It is to establish the reasoning grammar Crow should preserve as later corpora grow.

## Compact principle set

1. Every person has a before.
2. Before is pressure, not destiny.
3. Events matter; interpretations also matter.
4. Relationships are causal forces.
5. Repeated rewards shape repeated behaviour.
6. Power magnifies the consequences of character.
7. Corrective feedback is a protective structure.
8. Trauma can explain vulnerability without predicting violence.
9. Harm can arise without trauma.
10. Remorse and accountability can coexist.
11. Narrative role is not moral essence.
12. Side characters belong to themselves.
13. Myth offers lenses, not cages.
14. A character's self-myth may differ from reality.
15. The most revealing question is often: where could this trajectory still have changed?
