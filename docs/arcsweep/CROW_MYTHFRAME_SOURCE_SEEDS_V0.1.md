# Crow Mythframe Source Seed Manifest v0.1

Status: candidate source manifest  
Purpose: first provenance anchors for principle extraction into the Crow Character Becoming curriculum  
Training status: **not approved for direct raw-text training**

## Ingest rule

Use these sources to derive short, user-authored principles and synthetic teaching examples. Do not mirror source prose into the dataset. Preserve the source URL, access note, extraction date, principle ID, reviewer, and train/eval destination.

## Seed sources

### JCF-CAMPBELL-001

Source: Joseph Campbell Foundation, overview of *The Hero with a Thousand Faces*  
URL: https://www.jcf.org/  
Class: mythology-narratology  
Use: establish what Campbell's own tradition calls the Hero's Journey / comparative myth lens.  
Do not infer: that the framework is mandatory, exhaustive, culturally universal in practice, or superior to culture-specific narrative structures.  
Candidate principles:

- mythic transformation can be analysed through recurring thresholds, ordeals, transformation and return
- a mythic lens describes one reading of a story; it does not dictate the story
- the character's self-myth may differ from the surrounding narrative reality

### NIMH-PTSD-001

Source: National Institute of Mental Health, Traumatic Events and Post-Traumatic Stress Disorder  
URL: https://www.nimh.nih.gov/health/topics/post-traumatic-stress-disorder-ptsd  
Class: psychology / trauma-development  
Use: high-level grounding for PTSD as a condition associated with trauma exposure and persistent symptoms that affect daily functioning.  
Do not infer: diagnosis from a fictional behaviour, inevitability, dangerousness, or violence.  
Candidate principles:

- people respond to trauma in varied ways
- many trauma reactions lessen over time; persistent impairment may be associated with PTSD
- trauma history alone is insufficient to infer a particular future behaviour

### VA-TRIGGER-001

Source: VA National Center for PTSD, Trauma Reminders: Triggers  
URL: https://www.ptsd.va.gov/understand/what/trauma_triggers.asp  
Class: psychology / trauma-development  
Use: ground the idea that later people, places, sounds, smells, events or other cues may remind someone of trauma and increase distress or PTSD symptoms.  
Do not infer: that every strong reaction is PTSD, that cue reactivity removes agency, or that triggers normally produce violence.  
Candidate principles:

- present cues may acquire meaning through resemblance to earlier danger
- a trauma reminder can produce emotional or physiological distress even when the later situation is different
- reactions vary and can include vigilance, avoidance, anger, fear, helplessness or other responses
- training examples should heavily represent nonviolent responses

### CDC-ACES-001

Source: Centers for Disease Control and Prevention, Adverse Childhood Experiences prevention / risk and protective factors  
URLs:
- https://www.cdc.gov/aces/prevention/index.html
- https://www.cdc.gov/aces/risk-factors/index.html

Class: psychology / trauma-development / public health  
Use: ground developmental context in interacting individual, relationship, community and societal factors, while also representing protective conditions.  
Do not infer: that ACE exposure determines adult personality, criminality, diagnosis or morality.  
Candidate principles:

- developmental outcomes arise from interacting risk and protective factors rather than a single cause
- safe, stable and nurturing relationships/environments can be protective
- adverse childhood experience is a pressure in a life trajectory, not a destiny statement
- character generation should include resilience, ordinary adulthood, compassion and recovery alongside dysfunction

## Required expansion lanes

This seed manifest is intentionally small. Before Mythframe training is approved, add reviewed sources in these lanes:

1. comparative folklore / narratology beyond Campbell
2. tragedy and failed-return structures
3. collective/community-centred narrative models
4. trickster traditions with culture-specific provenance
5. attachment/developmental psychology
6. social learning / reinforcement
7. group conformity, dehumanisation and institutional power
8. remorse, moral injury, repair and restorative processes
9. biography/history methodology for separating documented fact from interpretation
10. culturally specific myth scholarship with permissions and provenance

## Historical case-study boundary

Historical rulers, perpetrators, revolutionaries, victims, dissidents and ordinary participants may be used for comparative narrative analysis, but the corpus must keep these lanes separate:

- documented fact
- attributed contemporary claim
- historian interpretation
- later legend/mythologisation
- model hypothesis

The model must not retro-diagnose a historical person as fact.

Historical examples are primarily **evaluation/reference material** in v0.1. Synthetic fictional examples should carry most SFT weight until the fact/inference separator is proven reliable.

## Review gate

A source is not training-ready because it appears in this file. Promotion requires:

1. provenance recorded
2. access/licence note recorded
3. principles paraphrased in Rowan/Crow project language
4. copyrighted source prose excluded unless authorised
5. cultural handling reviewed where applicable
6. candidate principles reviewed for flattening
7. training and held-out examples separated before tuning
