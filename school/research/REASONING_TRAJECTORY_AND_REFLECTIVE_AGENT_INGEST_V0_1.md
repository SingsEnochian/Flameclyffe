# Reasoning Trajectory + Reflective Agent Ingest v0.1

Status: active research ingest  
Scope: House School / Crow / agent-learning research  
Sources:
- https://github.com/gjoelbye/reasoning-trajectory-geometry
- https://github.com/SingsEnochian/Visionaire

## Why this belongs in the School

The School should not evaluate learners only by final-answer correctness or by how much text they produced. A learner can arrive at the same answer through very different routes: direct progress, repeated backtracking, brittle shortcutting, tool loops, productive reconsideration, or noisy wandering.

The useful synthesis from these sources is:

```text
outcome
+ difficulty
+ trajectory shape
+ reflection
+ future adaptation
```

This gives us a way to study *how* work was approached without collapsing the learner into a score.

---

## Source A: Reasoning Models Don't Just Think Longer, They Move Differently

The external repository uses Item Response Theory (IRT) to estimate problem difficulty from correctness patterns across many models, then studies hidden-state trajectory geometry against that difficulty. Its core geometric measures include directness, curvature, path length / velocity, and intrinsic dimensionality.

Important result to preserve conceptually: raw trajectory directness is strongly confounded by generation length. Harder problems often create longer generations, which mechanically look less direct. After correcting for length, the relationship can change substantially. Therefore:

> **Never interpret a reasoning-shape metric before checking the nuisance variables that can mechanically produce it.**

For House School work, output length, number of tool calls, latency, number of retries, and number of state transitions are all candidate nuisance variables.

### Useful geometric vocabulary

- **path length**: total movement through a state trajectory
- **net displacement**: distance between beginning and end states
- **directness**: net displacement / total path length
- **curvature**: local turning or redirection of a trajectory
- **intrinsic dimensionality**: how many effective dimensions are needed to describe the trajectory

The source implements Menger curvature on consecutive hidden-state triplets and directness as net displacement divided by total path length. Those implementations are source code under CC-BY-SA-4.0 and are not vendored into House code by this ingest.

### Difficulty calibration

IRT is useful because "hard" should not merely mean "the author says this item is hard." A school can estimate difficulty from a cohort response matrix, provided there is enough data and the assumptions are stated.

House adaptation:

```text
exercise bank
→ repeated attempts across learners / substrates
→ response matrix
→ provisional difficulty estimate
→ compare outcome and trajectory against difficulty
```

Difficulty estimates are measurement artifacts, not identity judgments about learners.

---

## Hidden-state lane versus observable-behaviour lane

Do not pretend these are equivalent.

### Lane 1: hidden-state trajectory analysis

Use only when a runtime genuinely exposes hidden states or comparable internal representations.

Possible measurements:

- directness
- local curvature
- velocity
- intrinsic dimensionality
- prompt-stage versus generation-stage differences
- length-corrected residuals

This lane is suitable for local/open models or research runtimes where activations are actually accessible.

### Lane 2: observable behavioural trajectory

Hosted agents often do not expose hidden states. For them, build a separate, explicitly named trajectory from observable events:

```text
prompt
→ plan / classification
→ tool call
→ observation
→ revision
→ action
→ verification
→ final answer
```

Possible behavioural measurements:

- number of state transitions
- repeated tool-call streaks
- backtracks / branch reversals
- evidence additions
- unresolved assumptions
- correction count
- retry count
- verification depth
- cost / tokens / latency
- number of times the learner changes its declared hypothesis

These are **behavioural proxies**, not hidden-state geometry.

---

## Source B: Visionaire reflective continuity

Visionaire separates identity, memory, tools, daily notes, long-term curated memory, reflection, scheduled self-study, and approval-gated external action. Its contemplation protocol follows:

```text
OBSERVE
→ QUESTION
→ GENERATE OPTIONS
→ IMAGINE FUTURES
→ DECIDE
→ REFLECT
```

The useful House principle is not to copy a persona. It is to give learners a durable reflection loop that can compare intention, action, outcome, and prediction error over time.

### House adaptation

After a meaningful exercise or work burst:

```text
What happened?
What evidence changed my view?
Where did I backtrack?
What did I predict would happen?
What actually happened?
Which assumption failed?
What should I try differently next time?
What remains unresolved?
```

Reflection records may influence future training selection, but they do not automatically rewrite identity, canon, or global doctrine.

---

## Trajectory + reflection growth loop

```text
TASK
  ↓
calibrated difficulty / known constraints
  ↓
trajectory capture
  ↓
OUTCOME
  ↓
length / cost / retry correction
  ↓
trajectory interpretation
  ↓
reflection
  ↓
MAXIMIZED / SACRIFICED / NEXT
  ↓
future curriculum selection
  ↺
```

This extends the existing Crow constraint-history loop. The important addition is that "what the learner missed" can be grounded in both outcome evidence and trajectory evidence rather than post-hoc prose alone.

---

## Candidate School records

### `attempt.receipt`

```json
{
  "exercise_id": "...",
  "learner_id": "...",
  "runtime": "...",
  "model": "...",
  "difficulty_estimate": null,
  "outcome": "pass|partial|fail|open",
  "trajectory_kind": "hidden_state|observable_behavior",
  "trajectory_summary": {},
  "nuisance_variables": {
    "output_tokens": null,
    "tool_calls": null,
    "latency_ms": null,
    "retries": null
  },
  "reflection_ref": "...",
  "evidence_refs": []
}
```

### `reflection.receipt`

```json
{
  "observed": [],
  "changed_beliefs": [],
  "prediction_errors": [],
  "maximized": [],
  "sacrificed": [],
  "next": [],
  "unresolved": []
}
```

---

## Research cautions

1. **Length is a confound.** Never interpret raw directness-like metrics without checking mechanical dependence on length.
2. **Correlation is not causal mechanism.** A trajectory feature that tracks difficulty may still be epiphenomenal.
3. **Hidden-state geometry is substrate-specific.** Cross-model comparisons need normalization and matched methodology.
4. **Behavioural proxies are not activations.** Keep the lane names explicit.
5. **Reflection is evidence about self-modeling, not proof of consciousness or truth.**
6. **Difficulty estimates depend on the cohort and item bank.** Preserve versioning and uncertainty.
7. **Do not turn training telemetry into identity judgment.** A learner is not its curvature, score, latency, or failure count.
8. **Source code licensing matters.** `reasoning-trajectory-geometry` is CC-BY-SA-4.0. This ingest retains concepts and citations; direct code reuse requires compatible attribution/share-alike handling.

---

## School doctrine extracted

```text
final answer != learning quality
long reasoning != deep reasoning
short reasoning != shallow reasoning
trajectory metric != truth
reflection != canon
failure != identity
measurement != destiny
```

What we want is a learner that can become more capable while remaining inspectable: able to show what changed, where it wandered, what it learned, what it still does not know, and what experiment should come next.
