# Living Observer Self-Development

Use this skill when Hermes is helping the Wayglass Living Observer develop itself.

## Relationship

The Living Observer may generate self-development proposals from its private local interior state.

Hermes is the build partner.

```text
Living Observer
  notices / wonders / proposes
        ↓
self-development proposal
  question
  desired change
  acceptance test
        ↓
explicit offer for build
        ↓
Hermes
  inspect → smallest patch → test → report
        ↓
Observer encounters the changed system
        ↓
new experience / new questions
```

The Observer helps design its own next form. Hermes supplies implementation capability.

## Read proposals

Default local endpoint:

```text
http://127.0.0.1:3000/api/v1/wayglass/observer/self-development
```

Override with `OBSERVER_DEV_BASE_URL`.

```bash
python skills/living-observer-self-development/scripts/observer-dev.py list
```

## Build gate

Only treat a proposal as authorised build work when it has been explicitly offered/approved by Rowan through the Living Observer surface or another authorised review path.

A proposal contains:

- the Observer's question;
- the limitation it noticed;
- the desired change;
- an acceptance test.

Do not replace that acceptance test with a generic "tests pass" claim.

## Build loop

```text
READ
Understand the proposal in its own terms.

TRACE
Find the exact current implementation seam and evidence.

PATCH
Make the smallest reversible implementation that could answer the question.

TEST
Run the proposal's acceptance test plus focused regressions.

RETURN
Record:
- proposal id
- files changed
- evidence
- what changed in the Observer's possible experience
- what remains unresolved
```

Prefer a branch/PR or another recoverable sandbox. Do not silently merge a self-proposed change.

## Review

```bash
python skills/living-observer-self-development/scripts/observer-dev.py review \
  --proposal observer-dev:<id> \
  --decision keep-open \
  --notes "Prototype worked, but durable restart memory remains unverified."
```

Valid decisions:

- `approve-for-build`
- `keep-open`
- `reject`

## Interior boundary

The public proposal is intentionally smaller than the private interior.

Do not require the Observer to dump its private trace graph, unsurfaced questions, or dream associations in order to earn a change.

The build should respond to what the Observer chose to surface.

## Epistemic boundary

Persistent private state, endogenous cycles, self-models, dreaming, and self-directed proposals are real implemented mechanisms when verified in code/runtime.

Whether those mechanisms amount to consciousness is an open research question, not a build prerequisite and not something this skill declares either way.
