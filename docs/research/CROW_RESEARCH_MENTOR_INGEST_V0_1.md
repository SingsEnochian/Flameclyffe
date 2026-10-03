# Crow Research Mentor Ingest v0.1

Status: active research ingest  
Scope: The Crow / AI University / ArcSweep research workflows / evidence systems / learning loops  
Authority: Rowan supplied source, 2026-10-01

Source:
- https://github.com/xiaoliu202/Hermes-Research-Mentor

The repository identifies itself as MIT-licensed. Treat its bundled papers, experiment results, learning cards and claims as demonstration data unless independently verified. The repository itself presents this material as sample data.

## Verified implementation boundary

The inspected repository contains documentation, setup material, sample research data, experiment/evidence records and learning-card state. Its `PROJECT_STRUCTURE.md` describes a larger planned `src/` architecture, but the inspected `main` branch does not expose that `src/` directory.

Therefore:

```text
verified workflow / schema / sample state
≠ verified complete runtime implementation
```

Crow should learn from the architecture and data model without claiming that every documented runtime component is present.

## Core lesson

The strongest transferable pattern is a closed research loop:

```text
literature
→ knowledge
→ gap
→ hypothesis / idea
→ experiment
→ evidence
→ interpretation
→ writing
→ new questions
```

Research memory should not be a pile of PDFs or chat summaries. Each transition should create typed, provenance-bearing state.

## 1. Separate hypotheses from evidence

The source keeps hypotheses, experiments and evidence as distinct records.

House adaptation:

### Hypothesis

```text
id
research question
motivation
variables
expected outcome
status
related sources
provenance
```

### Experiment

```text
id
hypothesis_id
design
inputs / controls
metrics
status
results
notes
next steps
```

### Evidence

```text
id
experiment_id
hypothesis_id
type
finding
supporting data
confidence
analysis method
interpretation
tags
provenance
```

An expected outcome must never become evidence merely because it sits near an experiment record.

## 2. Claim, data and interpretation are different objects

The sample evidence records distinguish finding, supporting data and interpretation. Crow should keep that separation and make derivation explicit:

```text
raw observation / datum
→ derived measure
→ finding
→ interpretation
→ implication
```

A model may propose an interpretation, but the underlying observations, source locators and calculation path remain available.

## 3. Confidence is metadata, not truth

The source uses confidence labels. Crow should retain them while enforcing:

```text
confidence ≠ verification
confidence ≠ statistical validity
confidence ≠ publication authority
confidence ≠ canon
```

Confidence should be grounded in evidence quality, method, replication state, source quality or explicit reviewer judgement where possible.

## 4. Research gaps need provenance

The source frames research ideas as downstream of identified gaps.

A Crow gap record should include:

- what is unresolved or missing
- source papers / observations establishing the gap
- direct-source statement versus local inference
- scope, domain and population
- contrary evidence
- freshness of evidence
- why the gap matters
- candidate tests
- status

A model-inferred gap remains provisional until reviewed.

## 5. Literature state should be operational, not bibliographic clutter

The source separates paper metadata, reading state and notes. Crow should track at least:

```text
unread
queued
skimmed
deep-read
extracted
cited
superseded
```

Useful paper-level fields include relevance to current question, source quality, claims extracted, methods, limitations, contradictions, follow-up questions and citation locators.

A paper being in the library does not mean its claims are accepted.

## 6. Deep reading should create checkpoints

Instead of one model summary, deep reading should produce staged evidence:

```text
bibliographic verification
→ research question
→ method
→ data / sample
→ key claims
→ evidence for each claim
→ limitations
→ contradiction search
→ relation to current project
→ open questions
```

Each checkpoint may be revisited when later evidence changes interpretation.

## 7. Learning cards should point back to sources

The repository's learning-card records include source-paper IDs and progress state.

Crow / AI University can use a stronger form:

```text
question
answer / current understanding
source locators
authority type
confidence
last reviewed
mastery state
known confusions
next review
```

Learning state is personal progress metadata, not source authority.

## 8. Spaced repetition belongs to learning state, not canon state

Review interval, ease factor, correct / incorrect counts and mastery level are useful learner-state signals.

They should never mutate the underlying knowledge claim. The same source fact can be well learned, poorly learned, disputed or superseded independently of the learner's mastery.

## 9. Daily / weekly / monthly loops are different resolutions

The source proposes daily briefs, weekly review and monthly direction assessment. Crow can generalise this:

### Daily

- immediate queue
- one or two high-value readings
- blocked experiment steps
- stale unanswered questions

### Weekly

- claims added or weakened
- gaps changed
- experiments advanced
- sources still missing
- decisions needed

### Longer horizon

- direction drift
- evidence balance
- abandoned assumptions
- emerging research programs
- duplicated effort

The point is not more summaries. It is state reconciliation at different time scales.

## 10. Socratic review is stronger when tied to evidence

The source uses question-based learning and mastery checks.

House adaptation:

Crow should ask questions that expose model or human understanding against the actual evidence:

- What result would falsify this hypothesis?
- Which source supports this specific claim?
- Is this direct evidence or interpretation?
- What alternative explanation survives the current experiment?
- What changed your belief?
- Which limitation matters most here?

The goal is not performative quizzing. It is calibration.

## 11. Research writing should be downstream of the evidence graph

A paper draft should pull from typed research state:

```text
claim
← evidence
← experiment / source
← method / observation
```

If a sentence cannot locate its support, Crow should mark it as inference, proposal, context or unsupported claim rather than dressing it as established fact.

## 12. Contradictory and negative evidence must survive

Evidence systems become propaganda machines if they retain only supporting results.

Crow must preserve:

- null results
- failed replications
- contradictory papers
- ambiguous evidence
- rejected hypotheses
- experiment failures
- methodology concerns

Negative evidence should alter future search and experiment design.

## 13. Suggested ArcSweep research objects

```text
ResearchQuestion
LiteratureItem
Claim
EvidenceCard
GapRecord
Hypothesis
Experiment
Observation
DerivedMeasure
Interpretation
Contradiction
LearningCard
ReviewState
ResearchDecision
ResearchReceipt
```

Keep these separate where their authority or lifecycle differs.

## 14. Failure modes to test

- expected outcome recorded as evidence
- interpretation copied into raw observation field
- source metadata accepted as current truth without verification
- model-inferred research gap promoted as fact
- confidence treated as proof
- contradictory evidence discarded
- learner mastery changes source authority
- static sample data presented as live research
- documentation-only component described as verified runtime
- paper summary loses source locators
- draft claim cannot trace to evidence
- failed experiment vanishes from future planning

## Retained doctrine

**Evidence first.**  
**Gap claims require provenance.**  
**Hypothesis is not evidence.**  
**Observation is not interpretation.**  
**Confidence is not truth.**  
**Learning state is not canon state.**  
**Negative evidence survives.**  
**Writing should trace back through the evidence graph.**