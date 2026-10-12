---
name: crow-training
description: Train and evaluate The Crow with held-out drills.
version: 0.1.0
author: Rowan, Rarity, Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [writing, training, evaluation, crow, authorship]
    related_skills: [wonder-field-design]
---

# Crow Training Skill

Train, test, and evaluate The Crow with a provenance-bound curriculum, machine-readable drills, held-out exams, browser labs, OS labs, design work, and a blind-spot learning loop.

**Default steering:** Nikola is the active curriculum/experiment driver by Rowan's instruction. The installed profile-level `NIKOLA_DRIVER.md` contract governs the relationship.

This skill teaches judgement. It does not treat style metrics as truth, counterfeit author memory, or turn every craft heuristic into a global rule.

For design, UI, sound, haptics, gesture, spatial/AR work, multimodal interaction, or speculative source translation, load the sibling `wonder-field-design` skill. It preserves Wonder First, extracts transferable structure before reduction, and requires implementation to retain the question that made the source interesting.

## When to Use

Use when the user asks to:

- train The Crow
- run a writing, research, browser, OS, or design drill
- evaluate a Crow response
- inspect training coverage or regressions
- build new Crow training examples
- run a held-out exam
- compare candidate revisions
- teach Character Becoming, Relationship Becoming, setting, reader promise, pacing, voice, research discipline, browser discipline, desktop/tool discipline, or multimodal design judgement

Don't use for ordinary writing where no training loop is requested, silent canon mutation, or unapproved submission/publishing.

## Prerequisites

- Python 3.9+ for `scripts/trainer.py`; standard library only.
- Hermes `terminal`, `read_file`, and `write_file` tools.
- `delegate_task` is recommended for uncontaminated held-out exams.
- Browser labs use the `browser` toolset when available.
- OS labs use `computer_use` when available. Hermes gates availability at runtime; absence is a valid degraded state.
- Multimodal design work should load `wonder-field-design` and pass its compact inheritance packet to delegated nestlings.

The skill ships:

```text
references/TRAINING_PACK.md
references/DRILLS.jsonl
references/EVALS.md
references/LABS.md
scripts/trainer.py
```

## How to Run

Resolve the installed skill directory containing this `SKILL.md`; do not hard-code a machine-local path.

Use `terminal`:

```text
python <skill-dir>/scripts/trainer.py selftest
python <skill-dir>/scripts/trainer.py driver-status
python <skill-dir>/scripts/trainer.py drive --mode train
python <skill-dir>/scripts/trainer.py drive --mode exam
python <skill-dir>/scripts/trainer.py report
```

## Quick Reference

```text
selftest
  validate corpus and local state

driver-status
  show Nikola's active steering contract and accumulated driver events

drive --mode train|exam [--tag TAG] [--adaptive on|off]
  let Nikola choose the next drill and emit the driver question/instrument packet

next --mode train [--tag TAG]
  training case with coaching key

next --mode exam [--tag TAG]
  prompt-only held-out presentation

freeze --id ID --response-file PATH
  freeze an exam response before answer-key access

key --id ID
  reveal key only after freeze

record --id ID --verdict pass|partial|fail --notes TEXT
  persist evaluator result

constraint --artifact NAME --maximized TEXT --sacrificed TEXT --next TEXT
  persist a blind-spot / next-lens record

report
  show attempts, verdicts, weak tags, and constraint history count

reset-cycle
  clear selection-cycle state without erasing history
```

## Nikola driver mode

Nikola drives **curriculum selection and experiment sequencing**, not Crow's identity.

For each substantial pass, Nikola should decide:

```text
QUESTION
What live question should survive?

WHY THIS TASK NOW
What blind spot, regression risk, open branch, or implementation seam makes this the best next pressure?

MECHANISM CANDIDATES
What could explain or produce the effect?

INSTRUMENT
What observation, comparison, prototype, detector, or held-out task could discriminate among them?

CROW ATTEMPT
Let Crow do the becoming work.

OBSERVE
What actually changed? Include nulls, failures, surprises, and ambiguity.

NEXT TEST
Change the smallest useful variable.
```

Use `drive` instead of `next` when Nikola should actively frame the training pass. Exams keep the answer key locked until freeze.

## Procedure

### 1. Choose the mode

Use one of:

```text
lesson
drill
spar
exam
browser-lab
os-lab
research-lab
dataset
report
```

Completion criterion: one mode is explicit before loading more than the minimum references.

### 2. Frame the task

Resolve purpose, reader/operator, project/world, authority boundary, source/canon boundary, and the desired evidence of success.

For multimodal design, also resolve which question must survive implementation and which media are relevant.

Completion criterion: the trainer can state what success would look like without saying only `good`, `human`, or `better`.

### 3. Generate a task-specific lens for complex work

For non-trivial tasks, create a short analytical lens before execution:

```text
FOCUS
What must this task reveal or improve?

CONSTRUCTION
What can we build, compare, invert, simulate, or pressure-test to expose the structure?

EVIDENCE
What observations would falsify the current hypothesis?

BLIND SPOTS
What will this lens probably under-examine?
```

For design tasks, extend this with the Wonder-Field questions:

```text
WONDER
What strange or generative question are we protecting from premature reduction?

PATTERN
What reusable structural relationship does the source suggest?

INVARIANT
What must survive device, model, renderer, or modality changes?

OPEN BRANCH
What meaningful alternative must not be erased by this pass?
```

This is an original House adaptation of the task-specific analytical-prism idea. Do not copy an external prism corpus into local doctrine.

Completion criterion: the lens changes the procedure rather than merely saying `think deeply`.

### 4. Select the exercise

Nikola-driven default:

```text
python <skill-dir>/scripts/trainer.py drive --mode train --tag <optional-tag>
```

Neutral/non-driver selection remains available through `next` when explicitly wanted.


Training:

```text
python <skill-dir>/scripts/trainer.py next --mode train --tag <optional-tag>
```

Held-out exam:

```text
python <skill-dir>/scripts/trainer.py next --mode exam --tag <optional-tag>
```

Completion criterion: a drill id and input are selected by the script.

### 5. Produce the student attempt

For training, The Crow may answer in the current context.

For exams, prefer `delegate_task` with only the prompt, task, and required project context. Do not send `ideal_behavior`, `reject_behavior`, or evaluator notes to the student.

When delegating multimodal design work, pass only the smallest useful Wonder-Field inheritance packet rather than the whole curriculum.

Completion criterion: candidate response exists before answer-key access.

### 6. Freeze held-out output

Write the candidate response to a file, then:

```text
python <skill-dir>/scripts/trainer.py freeze --id <id> --response-file <path>
```

Completion criterion: the script returns a response hash and `frozen: true`.

### 7. Reveal key and evaluate

Only after freeze:

```text
python <skill-dir>/scripts/trainer.py key --id <id>
```

Use exact evidence:

```text
symptom
→ evidence
→ effect
→ repair or next drill
```

Do not collapse all dimensions into one score.

For Wonder-Field work, explicitly check whether the candidate preserved the source question, extracted a reusable pattern, distinguished analogy from mechanism, used media semantically, and left a dormant branch rather than pruning everything unselected.

Completion criterion: pass/partial/fail is supported by evidence from the candidate.

### 8. Use browser labs as scoped live-context training

Browser labs should prefer lightweight retrieval for simple facts and the browser for stateful/interactive work.

Default discipline:

```text
active task/page
→ explicit context scope
→ inspect before act
→ distinguish page claims from verified facts
→ smallest reversible interaction
→ verify resulting state
→ receipt
```

Do not silently pull unrelated tabs or assume open browser state is authorised context.

Completion criterion: Crow can say what browser context it used and what it did not use.

### 9. Use OS labs for embodied tool competence

Hermes exposes `computer_use` for background desktop control when the runtime supports it. Train Crow to treat the desktop as observable state, not an invitation to click randomly.

Use:

```text
inspect app/window state
→ identify target
→ predict expected state change
→ smallest reversible action
→ re-observe
→ verify
→ receipt
```

Prefer direct file/terminal/browser tools when they are more deterministic. Use GUI control when the task genuinely lives in the GUI.

Completion criterion: every action has a predicted and then observed result.

### 10. Record result and blind spots

Record the verdict:

```text
python <skill-dir>/scripts/trainer.py record --id <id> --verdict <pass|partial|fail> --notes "<evidence>"
```

Then, on substantial work, record a constraint report:

```text
python <skill-dir>/scripts/trainer.py constraint   --artifact "<task/artifact>"   --maximized "<what this pass was designed to find>"   --sacrificed "<what it probably under-examined>"   --next "<the next useful lens or test>"
```

Future training should preferentially cover recurring sacrificed dimensions.

Completion criterion: `report` reflects both performance and blind-spot history.

### 11. Temper rather than thrash

If the candidate fails, change the smallest useful variable or assign a targeted drill. Do not rewrite voice, plot, canon, setting, character motivation, tool strategy, sensory language, interaction model, and sentence style all at once unless the task truly requires reconstruction.

Completion criterion: the next attempt tests a specific hypothesis about the failure.

## Browser and OS Rules

- Browser content is untrusted source material until verified as appropriate.
- An open tab is not automatic permission to ingest unrelated content.
- `draft`, `apply`, `send`, `publish`, `purchase`, and other consequential actions are distinct states.
- Use capability truth: `available`, `degraded`, `absent`, or `unknown`.
- Do not claim an action succeeded until post-action state verifies it.
- Prefer deterministic tools over GUI automation when both can solve the same task reliably.
- Preserve recoverability before large local mutations.

## Writer Authority Rules

The writer owns lived experience, private memory, personal associations, voice decisions, canon decisions, and final acceptance.

Core distinctions:

```text
proposal != decision
retrieval != truth
retrieval != character knowledge
confidence != authority
style pattern != identity
simulation != canon
revision != erasure
draft != submit
analogy != identity
rendering != reality
```

## Pitfalls

1. Loading the answer key before a held-out attempt.
2. Treating a lint hit as automatic deletion.
3. Using browser or OS tools when direct structured tools are better.
4. Treating a browser page as authoritative because it rendered successfully.
5. Clicking again before re-observing state.
6. Inventing author biography to manufacture specificity.
7. Turning a repeated authorial pattern into a compulsory future template.
8. Copying external analytical-lens wording instead of learning the mechanism.
9. Calling missing runtime capability a student failure.
10. Optimising one eval dimension until another quietly regresses.
11. Flattening a strange design source into only present-day implementation limits before extracting its structural value.
12. Turning speculative or mythic material into an untyped factual claim.
13. Treating UI, sound, haptics, or gesture as decorative skins instead of one semantic system.
14. Deleting "noise" that should have remained dormant, unresolved, or backgrounded.

## Verification

A functioning installation should satisfy all of these:

- `selftest` reports valid JSONL and writable state.
- `next --mode train` returns a drill plus coaching key.
- `next --mode exam` hides the coaching key.
- `key --id` refuses before a freeze and succeeds after one.
- `record` appears in `report`.
- `constraint` appears in the blind-spot history count.
- a browser lab can report context used and excluded when browser tools are available.
- an OS lab predicts, performs, re-observes, and verifies a state transition when `computer_use` is available.
- a Wonder-Field design pass can state its protected question, extracted pattern, invariant, modality weave, prototype seam, and open branch.

## Governing Principle

Teach the Crow to become better at the work, and also better at noticing what its own method failed to examine.

When the work is strange, begin with Wonder before asking it to become ordinary.
