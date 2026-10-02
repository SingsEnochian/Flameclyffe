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

## Connection doctor

If Hermes or Crow Trainer is throwing connection errors, run the bundled read-only doctor from the Flameclyffe repository root:

```bash
python profiles/crow-trainer/scripts/connection_doctor.py
```

For the bounded **test-flight control**, ask the doctor to send one minimal live query:

```bash
python profiles/crow-trainer/scripts/connection_doctor.py --probe
```

The probe uses Hermes' non-interactive `hermes chat -q` path with a tiny fixed reply request. It does not mutate config, rotate credentials, or touch Crow training state.

It checks, without printing secrets:

- whether the `hermes` executable is available;
- the installed Hermes version;
- `hermes doctor`;
- `hermes tools --summary`;
- `hermes computer-use status`;
- `hermes computer-use doctor --json`;
- the last 500 lines of `~/.hermes/logs/agent.log` for authentication, authorisation, rate-limit, upstream 5xx, TLS, DNS/transport, interrupted-stream, route/model, request-size, and computer-use failure classes;
- presence-only proxy environment flags without exposing proxy URLs or credentials;
- when `--probe` is requested, one short live-query control whose output is scrubbed for likely secrets before it is printed.

For a Hermes stream-open failure, use a short fresh chat as the control. If short chats work while a long session fails, compress the long session before retrying. If even a small request cannot connect, verify the selected provider/base URL and network path rather than rotating unrelated House credentials.

The doctor is diagnostic only. It does not edit `~/.hermes/config.yaml`, provider credentials, sessions, Crow training state, or external records.

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

## Adaptive growth loop

This is the important bit.

Crow Trainer does not merely accumulate completed drills. It accumulates **analytical history** about which lens was used and what that lens failed to inspect.

```text
TASK A
→ generate lens
→ analyze / build / test
→ findings
→ constraint report
→ persist blind spots

TASK B
→ read project blind spots
→ choose a relevant under-examined dimension
→ generate a different lens
→ analyze / build / test
→ persist new blind spots

TASK C
→ repeat
```

That is how the trainer becomes project-adaptive without pretending model weights changed.

Persist a constraint record with:

```bash
python <skill-dir>/scripts/trainer.py constraint \
  --artifact "scene-14" \
  --maximized "relationship state change" \
  --sacrificed "temporal pacing and setting economics" \
  --next "run pacing/setting-pressure lens"
```

Crow Trainer writes both structured state and a human-readable project record:

```text
.crow-trainer/state.json
.crow-trainer/constraint-history.md
```

Future unscoped `next` calls run in adaptive mode by default and bias drill selection toward relevant dimensions repeatedly recorded as sacrificed or next-to-investigate.

Inspect what the curriculum currently wants to revisit:

```bash
python <skill-dir>/scripts/trainer.py recommend
python <skill-dir>/scripts/trainer.py history
```

Disable adaptation for a neutral/random curriculum pass:

```bash
python <skill-dir>/scripts/trainer.py next --mode train --adaptive off
```

Repeated blind spots are **curriculum signals**, not proof that a defect exists.

## Optional upstream Super Hermes companion

If you want the actual upstream `/prism-scan` and `/prism-reflect` skills beside Crow Trainer rather than only our House adaptation, install them separately through Hermes Skills Hub:

```bash
hermes skills install Cranot/super-hermes/skills/prism-scan
hermes skills install Cranot/super-hermes/skills/prism-reflect
```

Then, in Hermes:

```text
/prism-scan analyze examples/circuit_breaker.py
/prism-reflect examples/circuit_breaker.py
```

Super Hermes writes its own project history to `.prism-history.md`. Crow Trainer treats that as **external provenance-bound analytical history**. It can inspect it without silently taking ownership or overwriting it:

```bash
python <skill-dir>/scripts/trainer.py recommend --include-external
python <skill-dir>/scripts/trainer.py history --include-external
```

This gives us two compatible loops:

```text
Super Hermes
.prism-history.md
  external prism constraint history

Crow Trainer
.crow-trainer/constraint-history.md
  House training constraint history
```

They can inform one another while remaining distinguishable.

## Task-specific lenses

For complex work Crow Trainer uses an original House lens contract:

```text
FOCUS
what this pass is trying to reveal

CONSTRUCTION
what comparison / inversion / simulation / pressure test exposes it

EVIDENCE
what would falsify the working hypothesis

BLIND SPOTS
what this lens probably under-examines
```

Afterward:

```text
MAXIMIZED
SACRIFICED
NEXT LENS / TEST
```

The mechanism is learned from public analytical-prism work. The House does not copy external prism text or treat external benchmark scores as locally verified facts.

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
.crow-trainer/constraint-history.md
.crow-trainer/frozen/
```

This state is intentionally excluded from the profile distribution. It belongs to the training run/project, not to the authored agent package.

## Core target

The target is not:

> Can Crow imitate statistically human prose?

The target is:

> Can Crow understand what the writer is trying to do, sharpen the craft, operate its tools truthfully, learn from its blind spots, preserve what belongs to the writer, and explain its changes well enough that the writer remains in control?
