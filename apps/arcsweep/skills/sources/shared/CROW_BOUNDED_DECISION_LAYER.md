# Crow Bounded Decision Layer

Status: active user-authorised doctrine  
Authority: Rowan explicit ingest instruction, 2026-10-01  
Scope: The Crow / ArcSweep agents / AI University agent curriculum  
Source class: user-supplied visual architecture reference describing a semantic decision model named “Jev”

## Retained principle

Do not make a frontier generative model perform every step of an agent workflow.

Separate three kinds of work:

```text
open-ended reasoning / creation
        ↓
frontier model

semantic but bounded judgement
        ↓
bounded decision layer

exact validation / mutation / execution
        ↓
ordinary code
```

The bounded layer is a **pattern**, not a required vendor/model dependency. ArcSweep may implement it with deterministic scoring, a compact local model, a constrained classifier, a frontier model forced through a narrow schema, or another validated mechanism.

## Decision triage

For each candidate decision:

1. If it is deterministic, use code.
2. If it is semantic but bounded to known valid options, use the bounded decision layer.
3. If it requires open-ended reasoning, synthesis, writing, ambiguity handling, or invention, use the frontier model.
4. If impact is high, irreversible, authority-sensitive, or confidence is insufficient, require stronger review and/or a named human/authorised owner.
5. Code validates typed outputs before any durable action.

## Good bounded-decision tasks

The Crow may use this seam for:

- retrieval ranking;
- skill selection;
- tool routing among already-valid tools;
- next-step workflow routing;
- browser/action choice among already-extracted valid actions;
- keep/drop decisions during context compaction;
- memory-admission candidates;
- issue classification;
- confidence/priority bucketing;
- evaluation against a defined rubric;
- citation-support candidate ranking;
- yes/no escalation checks;
- selecting which analytical lens to invoke.

## Tasks that do not belong here

Do not use a bounded decision layer to pretend to solve:

- open-ended creative writing;
- deep ambiguous interpretation with no defined option space;
- invention of canon;
- legal or safety judgement requiring authorised review;
- irreversible destructive mutation;
- factual verification solely by probability score;
- character/world truth that lacks evidence;
- decisions outside the provided valid option set.

## Typed output contract

A bounded judgement should return a narrow machine-checkable object, for example:

```json
{
  "decision": "relationship-audit",
  "confidence": 0.91,
  "alternatives": [
    { "id": "continuity-audit", "score": 0.41 }
  ],
  "reasonCode": "scene_contains_relationship_delta",
  "evidenceRefs": ["scene:42:event:7"],
  "requiresEscalation": false
}
```

Code must still verify:

- `decision` is a valid option;
- required evidence exists;
- confidence satisfies the task threshold;
- impact/risk permits automatic continuation;
- authority permits the requested next action.

Typed output constrains a decision. It does not guarantee correctness.

## Crow workflow

```text
user intent / manuscript state
        ↓
deterministic filters construct valid options
        ↓
bounded decision layer chooses / scores / classifies
        ↓
confidence + impact gate
        ├── acceptable → code executes next safe step
        └── uncertain/high-impact → frontier model or authorised human review
        ↓
receipt + state update
        ↓
repeat
```

## Writing-specific applications

### Retrieval

Retrieve broadly, then rank passages for a specific question before loading them into the expensive reasoning context.

### Skill selection

Given the available Crow skills, select only the small set relevant to the current task. Do not inject the whole curriculum into every scene.

### Craft diagnostics

Use deterministic lint where possible. Use bounded classification to choose which diagnostic families apply. Use the frontier model only for the semantic judgement that truly needs it.

### Memory

Separate:

- retrieval relevance;
- whether a candidate fact is worth storing;
- whether the fact is actually authorised/canonical.

A memory-admission score never grants canon authority.

### Citation/evidence support

A bounded model may rank which source passage appears most relevant to a claim. Verification still depends on the actual source/evidence and deterministic/source-aware checks.

### Workflow control

The Crow may choose among predefined next steps such as:

- diagnose;
- retrieve;
- ask;
- simulate;
- propose edit;
- verify;
- escalate;
- stop.

The chosen step remains subject to state, authority, and mutation guards.

## AI University curriculum adaptation

Teach agents to distinguish:

- **reasoning** from **routing**;
- **classification** from **truth**;
- **proposal** from **execution**;
- **confidence** from **authority**;
- **memory relevance** from **canon**;
- **semantic judgement** from **deterministic validation**.

Exercises should require agents to identify the cheapest reliable layer that can perform a task without flattening uncertainty.

## Failure modes

Test for:

- sending a deterministic rule to an expensive model;
- asking a bounded classifier to invent an option;
- executing an unvalidated typed response;
- treating confidence as correctness;
- treating relevance as truth;
- treating retrieval as character knowledge;
- writing memory without authority checks;
- auto-promoting a semantic judgement into canon;
- skipping human/owner review for irreversible/high-impact actions;
- loading every available skill instead of selecting relevant capabilities;
- model routing loops without a stop condition;
- escalation that loses the evidence/options that caused it.

## Core law

**Reason broadly only where broad reasoning is needed. Decide narrowly where the option space is known. Validate and execute with code. Escalate when confidence, impact, or authority demands it.**
