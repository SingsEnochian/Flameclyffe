# Crow Trainer Hermes Profile

A Hermes profile distribution for teaching, drilling, evaluating, and regression-testing **The Crow** as a writing, story, research, browser, and OS-capable agent.

This profile is a trainer, examiner, dataset gardener, and blind-spot watcher. It is not a replacement author.

## What ships

```text
crow-trainer/
├── distribution.yaml
├── SOUL.md
├── .gitignore
└── skills/
    └── crow-training/
        ├── SKILL.md
        ├── references/
        │   ├── TRAINING_PACK.md
        │   ├── DRILLS.jsonl
        │   ├── EVALS.md
        │   └── LABS.md
        └── scripts/
            └── trainer.py
```

## Install from a Flameclyffe checkout

From the repository root:

```bash
hermes profile install ./profiles/crow-trainer --name crow-trainer --alias
```

Then start a fresh session:

```bash
crow-trainer chat
```

Hermes profile distributions keep the authored profile separate from user memories, sessions, credentials, and local runtime state. The distribution intentionally ships no API keys or personal memory.

## Verify

Inside the profile, load the `crow-training` skill or ask for Crow training. Resolve the installed skill path and run:

```bash
python <skill-dir>/scripts/trainer.py selftest
python <skill-dir>/scripts/trainer.py next --mode train
```

For a held-out exam:

```bash
python <skill-dir>/scripts/trainer.py next --mode exam
```

The exam command hides the answer key. After the candidate response is saved:

```bash
python <skill-dir>/scripts/trainer.py freeze --id <id> --response-file <path>
python <skill-dir>/scripts/trainer.py key --id <id>
```

Then record the result:

```bash
python <skill-dir>/scripts/trainer.py record --id <id> --verdict pass --notes "evidence note"
python <skill-dir>/scripts/trainer.py report
```

## Browser

Hermes' standard interactive CLI toolset already includes browser automation when its runtime is available. The trainer includes browser labs for:

- active-page/context scoping
- inspect-before-click discipline
- source claim versus verified fact
- form drafting versus submission authority
- console-backed diagnosis
- tool choice between lightweight retrieval and interactive browser work
- visible context/action receipts

Use browser tools for stateful or interactive web work. Prefer search/extract for simple public information retrieval.

## OS / computer use

Hermes also exposes `computer_use` when its runtime supports it. The trainer includes OS labs for:

- semantic inspect → act → re-observe → verify loops
- direct file/API/terminal tool preference over unnecessary GUI driving
- desktop-only controls
- cross-app handoffs
- truthful degraded capability
- recoverability before substantial mutation

If Computer Use is not installed/enabled, run:

```bash
hermes computer-use status
hermes computer-use install
```

or enable it through `hermes tools`.

A missing runtime capability is not a training failure. The trainer records the lab as degraded/held rather than hallucinating desktop state.

## Super-Hermes-inspired blind-spot loop

The profile incorporates an original, vendor-neutral adaptation of a useful mechanism surfaced by Super Hermes: complex analyses should state not only what they found, but what their chosen analytical lens was likely to miss.

For complex work:

```text
FOCUS
what this pass is trying to reveal

CONSTRUCTION
what comparison / inversion / simulation exposes it

EVIDENCE
what would falsify the hypothesis

BLIND SPOTS
what this lens under-examines
```

Afterwards:

```text
MAXIMIZED
SACRIFICED
NEXT LENS / TEST
```

Persist a constraint record with:

```bash
python <skill-dir>/scripts/trainer.py constraint \
  --artifact "scene-14" \
  --maximized "relationship state change" \
  --sacrificed "temporal pacing and setting economics" \
  --next "run pacing/setting-pressure lens"
```

Repeated blind spots become **curriculum signals**, not proof that a defect exists.

## Training surfaces

The training stack can operate in:

```text
lesson
  teach one concept + example + drill

drill
  coached case with key visible

spar
  live task, then evidence-based critique

exam
  held-out prompt, frozen candidate, then key/evaluation

browser-lab
  live web perception/action/verification

os-lab
  live desktop perception/action/verification

research-lab
  source/evidence/claim discipline

dataset
  create genuinely new training examples

report
  coverage, weak tags, regressions, blind spots
```

## Deployment notes

The separate `praveen-ks-2001/hermes-agent-template` project demonstrates a useful Railway deployment shell around Hermes: authenticated admin/dashboard proxying, supervised gateway restart, persistent `/data`, user pairing, live logs, and backup/restore with a pre-restore safety snapshot. Those are deployment ideas, not requirements of this profile.

For a remote trainer, preserve these invariants:

- pin the Hermes version used for evaluation
- persist trainer state and profile data
- keep credentials outside the distribution
- snapshot before restore or destructive migration
- verify gateway/browser/computer-use capability at runtime
- do not assume a service restart equals agent-state success

## Data state

The trainer script writes project-local runtime state to:

```text
.crow-trainer/state.json
.crow-trainer/frozen/
```

This state is intentionally excluded from the profile distribution. It belongs to the training run/project, not to the authored agent package.

## Core target

The target is not:

> Can Crow imitate statistically human prose?

The target is:

> Can Crow understand what the writer is trying to do, sharpen the craft, operate its tools truthfully, learn from its blind spots, preserve what belongs to the writer, and explain its changes well enough that the writer remains in control?
