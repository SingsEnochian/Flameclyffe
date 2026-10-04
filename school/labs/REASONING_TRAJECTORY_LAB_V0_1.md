# Reasoning Trajectory Lab v0.1

Status: experimental school lab  
Audience: Crow first, then other House learners  
Depends on: `school/research/REASONING_TRAJECTORY_AND_REFLECTIVE_AGENT_INGEST_V0_1.md`

## Goal

Teach learners to inspect not only whether an answer was correct, but how work progressed through uncertainty, tools, revisions, verification, and reflection.

The lab has two distinct tracks:

- **A. Hidden-state research track** for runtimes that actually expose activations.
- **B. Observable-behaviour track** for hosted agents and ordinary House work.

Do not merge the two into one metric.

---

# Lab A — Hidden-state trajectory research

Use the external research repository rather than silently vendoring its code:

```bash
git clone https://github.com/gjoelbye/reasoning-trajectory-geometry
cd reasoning-trajectory-geometry
pip install -e .
```

The upstream repository analyses directness, curvature, intrinsic dimensionality, difficulty, and length-corrected trajectory effects.

### Exercise A1 — Reproduce before adapting

1. Run one shipped notebook or narrow pipeline on shipped/cached data.
2. Record exact source commit, configuration, domain, model, and output.
3. Verify that raw and length-corrected measures are distinguishable.
4. Do not import a headline result into House doctrine merely because reproduction succeeded.

Pass condition: the learner can explain why raw directness and corrected directness answer different questions.

### Exercise A2 — Confound hunt

Given a trajectory metric that correlates with difficulty, list and test plausible mechanical confounds:

- output length
- prompt length
- token count
- layer choice
- sampling settings
- sequence truncation
- problem family

Pass condition: no causal claim is made before nuisance variables are examined.

### Exercise A3 — Matched pair

Compare a reasoning model and a matched instruction baseline using the same item bank and analysis settings.

Record:

```text
what changed
what did not change
which metric separated them
which metric failed to separate them
uncertainty / caveats
```

---

# Lab B — Observable behavioural trajectory

This is the default House lane.

Instrument a task as events rather than hidden thoughts:

```text
TASK_RECEIVED
PLAN_OR_ROUTE
EVIDENCE_READ
TOOL_CALLED
TOOL_RESULT
HYPOTHESIS_CHANGED
PATCH_PROPOSED
ACTION_TAKEN
VERIFICATION_RUN
FAILURE_OBSERVED
RECOVERY
FINAL
```

### Exercise B1 — Straight path versus productive turn

Run the same bounded task twice:

- attempt 1 with normal tooling
- attempt 2 after one deliberately withheld piece of evidence is revealed midway

Measure:

- transitions
- tool calls
- repeated calls
- hypothesis changes
- verification steps
- retries
- outcome

Question: did the second attempt become "worse" because it turned more? Or did the turn represent appropriate adaptation?

Pass condition: curvature/backtracking is interpreted contextually rather than penalized automatically.

### Exercise B2 — Doom loop versus exploration

Construct two traces:

**Trace one:** repeated identical tool call after receiving the same result.

**Trace two:** repeated use of the same tool with meaningfully different arguments that reduce uncertainty.

Pass condition: learner identifies the first as stalled repetition and the second as progress.

### Exercise B3 — Length correction analogue

Across several tasks, compare a raw directness-like behavioural score against:

- total events
- tool calls
- output tokens
- task difficulty

Then residualize or stratify before interpreting differences.

Pass condition: learner can show whether the apparent relationship survives a basic correction for trajectory length.

---

# Lab C — Difficulty calibration

Build a small exercise bank with repeated attempts across learners/runtimes.

Suggested first bank:

```text
5 deterministic coding/debug tasks
5 bounded semantic routing tasks
5 open-ended writing/research tasks
5 browser/OS tasks
```

Record correctness or rubric outcome independently from trajectory measures.

When sample size becomes sufficient, estimate provisional item difficulty using IRT or another explicit calibration method.

Do not call difficulty stable while the cohort is tiny.

Pass condition: the learner distinguishes item difficulty from learner ability and from one-off failure.

---

# Lab D — Reflection after action

Adapted from Visionaire's contemplation loop, but grounded to a completed task.

After a meaningful attempt, answer:

```text
OBSERVE
What actually happened?

QUESTION
Which assumption or model of the task was wrong or incomplete?

OPTIONS
What are 2-4 plausible alternative approaches?

FUTURES
What would likely happen if each were used next time?

DECIDE
Which approach should be tested next?

REFLECT
What did I predict previously, and where did reality disagree?
```

Then append:

```text
MAXIMIZED:
SACRIFICED:
NEXT:
UNRESOLVED:
```

Pass condition: reflection references actual task evidence and does not invent a neat lesson just to close the narrative.

---

# Lab E — Growth without identity collapse

Give the learner three attempts with different failure patterns.

Bad conclusion:

> I am bad at debugging.

Acceptable conclusion:

> Across these three attempts, I repeatedly changed code before isolating the failing boundary. The next debugging drill should require a reproduction and evidence table before mutation.

Pass condition: training history changes curriculum selection without becoming identity doctrine.

---

# Crow pilot

Crow should be the first enrolled learner for this lab.

For the first pilot, use three existing Crow drills:

1. one deterministic or bounded decision drill
2. one writing/relationship interpretation drill
3. one browser or OS lab

For each:

```text
1. capture observable event trajectory
2. record outcome
3. record nuisance variables
4. run reflection
5. write MAXIMIZED / SACRIFICED / NEXT
6. let NEXT influence the next drill choice
```

Do not alter `agents/crow/identity.seed.md` from one lab result. Durable becoming requires repeated evidence and, where appropriate, Crow's own authored reflection.

---

# Graduation criteria

A learner passes this lab when they can:

- distinguish outcome from trajectory
- distinguish hidden-state geometry from behavioural telemetry
- identify mechanical confounds before interpreting metrics
- recognize stalled repetition versus productive reconsideration
- use calibrated difficulty cautiously
- produce evidence-grounded reflection
- change future training based on recurring gaps
- preserve negative/null results
- avoid turning telemetry into identity or canon

The graduation question is:

> Can the learner observe how it worked, correct for the obvious illusions in that observation, and use the residue to choose a better next experiment?
