# Open-Source Writing Tool Architecture Ingest v0.1

Status: architecture study / product-pattern ingest  
Scope: ArcSweep / The Crow / AI University / writing workbench / manuscript tooling  
Authority: Rowan explicit instruction, 2026-10-01

## Purpose

Study public open-source writing tools as product and systems references. Extract reusable architectural principles, workflow patterns, data models, diagnostics, and human-in-the-loop mechanisms. Do not silently copy implementation or source expression into ArcSweep.

Sources in this tranche:

- `302ai/302_novel_writing`
- `christiandarkin/Creative-Writers-Toolkit`
- `yannikzz/narracat-novel-agent`
- `writerslogic/scrivener-mcp`
- `travsteward/openwriter`
- `NikhilVerma/writinglint`
- `myyimu/ai-novel-diagnosis`
- GitHub topic discovery: `writing-tools` + TypeScript

## Cross-project finding

The strongest tools separate **writing surface**, **story state**, **analysis**, **memory**, **agent orchestration**, and **author approval** instead of collapsing them into one model prompt.

The recurring architecture is:

```text
source manuscript / world data
        ↓
structured project state
        ↓
analysis / planning / memory / linting tools
        ↓
agent proposes work
        ↓
author review / approval / revision
        ↓
accepted state / file update
        ↓
version / history / re-analysis
```

For ArcSweep, this reinforces the existing doctrine:

**the model proposes; the system tracks; the writer decides.**

---

## 1. 302 AI Novel Writing

Public features include:

- manual editing and AI-assisted generation in the same workspace;
- chapter generation;
- plot planning;
- explicit character selection for upcoming chapters;
- outline templates;
- real-time revision;
- style selection;
- cover generation/upload;
- multilingual UI;
- planned relationship mapping;
- a modern TypeScript/Next.js editor stack.

The interface strings reveal an important product pattern: a writer can specify a **small next-chapter plot unit**, select which characters participate, and use that bounded context to generate a chapter. The UI explicitly warns against making the requested plot span too large.

### Retained lesson

**Generation quality improves when the task is bounded to a local narrative unit.**

For ArcSweep:

```text
story/world state
+ selected participants
+ local objective
+ current pressures
+ open setups/questions
+ desired scene/chapter span
→ candidate scene/chapter
```

Do not ask a model to solve the whole novel every turn.

A second useful pattern is the visible separation between outline, chapter planning, character selection, and prose generation. Preserve those as distinct surfaces even if ArcSweep allows fluid transitions between them.

License note: the repository publicly includes Apache-2.0. Architectural study remains provenance-bound regardless of licence.

---

## 2. Creative Writers' Toolkit

This 2022 GPT-3-era toolkit is crude by modern standards, but its decomposition is structurally valuable.

Its public workflow includes:

1. create characters from genre, supporting files, and a short directional tweak;
2. generate synopses from those materials;
3. break synopsis into scene lists;
4. split scene lists into individual scene files;
5. turn scene files into scripts;
6. assemble scenes into a complete script;
7. switch structural lenses such as Hero's Journey, Save the Cat, and Three-Act Structure;
8. let the human interrupt and edit text files between stages;
9. experiment with character chat and utilities.

The repository explicitly says the writer should intervene between stages and that outline quality strongly affects final output quality.

### Retained lesson

**Hierarchical decomposition plus human intervention beats one-shot generation.**

Useful ArcSweep translation:

```text
concept
→ premise
→ cast
→ synopsis
→ structural lens
→ act / sequence / chapter
→ scene
→ beat
→ prose
```

At every level, allow the writer to:

- inspect;
- edit;
- reject;
- regenerate locally;
- lock accepted material;
- change the structural lens without losing the manuscript.

A second lesson: different structural frameworks should operate as interchangeable **views over story state**, not as mutually exclusive canon schemas.

Do not reproduce the toolkit's prompts or old GPT implementation. Learn the workflow shape.

---

## 3. NarraCat

NarraCat is particularly relevant because it treats long-form fiction as a persistent software system rather than a stack of prompts.

Public architecture separates:

- desktop application layer;
- creative engine;
- agents / skills / commands;
- schemas;
- a dedicated NovelMemory service;
- novel file contracts;
- capability packs;
- character chat;
- architecture checks.

Public product claims include long-range memory for very long serial fiction, structured management of characters / foreshadowing / worldbuilding, project planning from project card to outline to chapter outline to prose, and a local-first manuscript model.

### Retained lessons

**A. Long fiction needs a dedicated memory substrate.**

Memory should store explicit story facts, unresolved setups, character state, relationship state, world state, and provenance rather than relying on transcript recall.

**B. Stable contracts should separate UI from creative engine.**

ArcSweep's holographic/workbench UI should be replaceable without rewriting story cognition.

**C. Agent capabilities should be modular.**

The Crow should load specialised writing capabilities rather than receiving a monolithic permanent prompt.

**D. Architecture invariants should be testable.**

Treat dependency direction, state mutation, canon authority, privacy, and memory boundaries as things CI can validate.

---

## 4. Scrivener MCP

Scrivener MCP shows what a mature writing integration looks like when an AI assistant operates directly against a real manuscript project.

Public capabilities include:

- project discovery/opening;
- binder hierarchy browsing;
- chapter/scene reading and writing;
- metadata changes;
- snapshots and comparison;
- keyword and semantic search;
- character / plot / relationship tracking;
- continuity analysis;
- writing style analysis;
- targeted enhancement;
- author preferences;
- feedback collection;
- manuscript briefing;
- compile/export;
- persistent project memory.

A crucial product pattern is **progressive capability loading** rather than exposing every tool immediately.

Another is the use of native snapshots and pre-write backup before destructive edits.

### Retained lessons

**A. Writing systems need recoverability as a first-class feature.**

Before substantial edits:

```text
snapshot
→ propose change
→ review
→ commit
→ diff available
→ rollback possible
```

**B. Analysis should point to exact manuscript evidence.**

Do not return only abstract prose advice. Link diagnostics to passages, scenes, documents, and story-state records.

**C. Search by meaning is valuable, but semantic retrieval must remain distinct from canon authority.**

Finding a passage does not make an inference true.

**D. Manuscript metadata is useful state.**

Titles, synopses, status, labels, goals, notes, hierarchy and compile inclusion should be available to agents without requiring full-text rereads.

---

## 5. OpenWriter

OpenWriter's defining pattern is unusually clean:

**the agent writes; the human accepts or rejects.**

Public features include:

- plain Markdown files on disk;
- MCP-driven collaboration;
- visible pending changes;
- accept/reject review;
- version history;
- rollback;
- workspaces and shared context;
- Git sync;
- plugin architecture;
- export;
- agent interoperability rather than a captive built-in agent.

### Retained lesson

ArcSweep should distinguish:

```text
current accepted text
candidate insertions
candidate deletions
candidate rewrites
accepted revision
rejected revision
```

This is stronger than letting an agent silently overwrite prose.

The visual language of pending changes is especially relevant to an ArcSweep holographic workbench: proposed prose/state can literally appear as a different material layer until accepted.

---

## 6. WritingLint / SlopSift

WritingLint contributes a different lesson: some writing analysis should be **deterministic, local, and inspectable** rather than model-judged.

Public architecture:

```text
source text
→ parser
→ document/dependency representation
→ authorable rulepacks
→ exact ranges + diagnostics
```

It explicitly treats findings as editorial signals rather than authorship proof and supports severity/confidence levels.

### Retained lessons

**A. Build deterministic craft checks where possible.**

Candidates include:

- repeated sentence openings;
- excessive filter words;
- repetitive syntactic structures;
- dialogue-tag density;
- repeated weak constructions;
- paragraph-length anomalies;
- POV-name leakage;
- duplicate phrases;
- chapter word-count outliers;
- unintroduced proper nouns;
- unresolved placeholder text.

**B. Do not convert lint into quality scores.**

A diagnostic is a review candidate, not a verdict.

**C. Rulepacks can be personal.**

ArcSweep can eventually support:

```text
house craft rules
world-specific rules
Rowan-specific preferences
project-specific style rules
The Crow learned diagnostics
```

Each rule should state scope, provenance, confidence and whether it is deterministic or inferential.

---

## 7. AI Novel Diagnosis

This project strongly reinforces the direction of The Crow as **evidence-driven editor rather than rewrite machine**.

Public doctrine emphasises:

- inspect evidence before rewriting;
- diagnose and prioritise issues;
- bind findings to original text;
- let the author mark a finding accepted, intentional, false positive, or deferred;
- generate an actionable revision task/prompt after diagnosis;
- save a real revised version;
- re-diagnose the new version;
- use independent second review when desired;
- separate textual risk hypotheses from unsupported market/retention prediction;
- study mature works for structure without copying content.

Its evidence chain is particularly useful:

```text
editorial criterion
→ issue candidate
→ text evidence
→ possible reader effect
→ author confirmation
→ priority + boundary
→ revision task
→ revised version
→ re-evaluation
```

### Retained lesson

This should become a core Crow workflow.

The Crow should not jump immediately from:

```text
problem detected → rewrite prose
```

Prefer:

```text
problem hypothesis
→ evidence
→ why it matters
→ confidence
→ author decision
→ revision strategy
→ candidate change
→ post-change check
```

Also retain the principle:

**study structure, do not transplant content.**

---

## 8. GitHub TypeScript writing-tools ecosystem

The topic survey surfaced several relevant current patterns:

- agentic novel studios;
- manuscript MCP servers;
- local-first editors;
- deterministic prose linters;
- diagnosis/revision systems;
- long-form memory;
- writing workspaces designed to cooperate with external agents rather than embedding one fixed assistant.

Treat the topic page as a **discovery feed**, not an authority source. Repositories should be inspected individually before principles are promoted.

---

# ArcSweep synthesis

The combined architecture suggests the following writing workbench layers.

## 1. Manuscript Surface

Human-facing rich editor / scene cards / outline / binder / holographic spatial view.

Accepted manuscript is visually distinct from proposals.

## 2. Story State

Explicit machine-readable state:

- characters;
- relationships;
- locations;
- timeline;
- world laws;
- objects;
- promises;
- questions;
- setups/payoffs;
- scene/chapter state;
- canon status;
- provenance.

## 3. Memory

Long-range retrieval and explicit callback index.

Memory changes future affordances; it is not merely context stuffing.

## 4. Craft Diagnostics

Two lanes:

### deterministic

Rules, counts, structures, exact ranges.

### inferential

Character truth, emotional continuity, reader promise, thematic resonance, scene function, relationship delta.

Never pretend these lanes have the same epistemic status.

## 5. Planning / Simulation

Concept → premise → outline → sequence → chapter → scene → beat.

Allow alternate structural lenses without destroying accepted story state.

All simulations remain non-canon until promoted.

## 6. Agent Proposal Layer

The Crow and other agents may propose:

- analysis;
- edits;
- scene candidates;
- outline changes;
- callbacks;
- relationship developments;
- continuity repairs.

They do not silently mutate accepted manuscript/canon.

## 7. Review / Approval Layer

Every substantive mutation should be able to carry:

- diff;
- evidence;
- rationale;
- confidence;
- scope;
- provenance;
- accept/reject/defer;
- rollback target.

## 8. Version / Receipt Layer

Preserve snapshots and receipts for:

- manuscript edits;
- story-state edits;
- canon promotion;
- diagnostic resolution;
- learned craft-rule promotion.

---

# Suggested Crow modes

- `diagnose` — evidence-first editorial analysis
- `plan` — structure and scene/chapter planning
- `simulate` — non-canon alternate development
- `revise` — propose bounded text changes
- `lint` — deterministic style/craft diagnostics
- `continuity` — timeline, facts, character knowledge, unresolved setups
- `relationship` — relation-state evidence/delta
- `promise` — premise/reader-promise/payoff audit
- `memory` — retrieve relevant past story evidence
- `learn` — ingest craft principle with provenance

These should be composable modes, not separate personalities.

---

# Smallest useful implementation seam

Do not build a giant writing suite in one shot.

Prototype:

```text
open one project
→ read one scene
→ create snapshot
→ run deterministic + inferential analysis
→ produce evidence-bound findings
→ author marks finding accepted / intentional / false positive / defer
→ Crow proposes one bounded revision
→ show diff
→ accept or reject
→ record scene/state delta + receipt
→ re-run affected checks
```

This seam proves the essential architecture without requiring full autonomous novel generation.

---

# Failure states to test

- silent overwrite of accepted prose;
- proposal accidentally promoted to canon;
- analysis without evidence anchor;
- deterministic finding presented as universal aesthetic law;
- inferential finding presented as objective fact;
- scene generation using stale character state;
- relationship change without supporting event;
- revision erases intentional voice/style choice;
- global rewrite when local change was requested;
- memory retrieval treated as character knowledge;
- structural framework treated as mandatory;
- accepted edit cannot be rolled back;
- manuscript and structured story state drift apart;
- learned external pattern copied rather than abstracted.

---

# Core retained doctrine

**Decompose before generating.**  
**Bound the local task.**  
**Keep manuscript, story state, memory, analysis and rendering distinct.**  
**Let deterministic tools handle deterministic problems.**  
**Require evidence for editorial claims.**  
**Proposal is not acceptance.**  
**Snapshot before mutation.**  
**Keep the writer in the loop at every durable transition.**  
**Learn structure; do not steal expression.**  
**The agent writes. The writer decides.**
