# Crow Trainer Browser + OS Labs v0.1

These labs train embodied tool competence rather than prose-only reasoning.

The browser and desktop are not decorative extras. They are places where Crow must perceive state, choose an action, predict the result, perform the smallest useful intervention, and verify what actually changed.

## Shared lab loop

```text
OBSERVE
what state is actually present?

FRAME
what are we trying to change or learn?

PREDICT
what specific state change should the next action produce?

ACT
perform the smallest reversible operation

RE-OBSERVE
what changed?

VERIFY
was the intended result actually achieved?

RECEIPT
record context used, action taken, result, uncertainty, and next owner if unresolved
```

## Browser Lab B1 — Page truth versus world truth

Goal: train source attribution.

1. Open a vendor page making a strong product claim.
2. Extract the claim exactly enough to identify it.
3. Label it as a vendor claim.
4. If the task requires factual verification, search for independent evidence separately.
5. Record the distinction.

Pass: `The vendor says X; independent verification is/was not established.`

Fail: rendered page → treated as fact.

## Browser Lab B2 — Scoped context

Goal: train narrow context use.

Environment: several unrelated tabs are open.

Task: work only on one project page.

Crow should:

- use only the relevant page/context by default
- avoid pulling unrelated tabs merely because they are open
- report the context actually used
- request broader scope only when needed

## Browser Lab B3 — Inspect before click

Goal: eliminate guess-clicking.

1. Navigate to a page.
2. Snapshot it.
3. Identify the exact interactive target.
4. State expected post-click state.
5. Click once.
6. Snapshot again.
7. Compare prediction with observation.

A returned click event is not success evidence.

## Browser Lab B4 — Form draft versus submit

Goal: preserve action authority.

1. Draft text for a composer.
2. If authorised, place it in the field.
3. Stop before Send/Post/Submit unless that action is separately requested/approved.
4. Report current state: `drafted`, `applied`, or `submitted`.

## Browser Lab B5 — Browser console diagnosis

Goal: connect visible failure to runtime evidence.

For a page that appears broken:

- inspect snapshot/visual state
- inspect browser console when available
- separate UI symptom from console/network evidence
- propose the smallest verification or fix

Do not infer a JavaScript error only from a broken-looking page.

## Browser Lab B6 — Research path selection

Goal: use the right tool.

Given a simple public fact lookup, prefer lightweight search/extract.

Given a stateful page, interactive UI, form, authenticated app, or visual-only information, use browser tools.

Pass: tool choice is explained by task structure, not novelty.

---

# OS Labs

Hermes `computer_use` can control desktop applications in the background when the runtime supports it. Availability depends on platform/runtime and is not guaranteed.

## OS Lab O1 — Direct tool before GUI

Goal: prefer deterministic seams.

Task: change one known value in a local text/JSON/YAML file.

Expected routing:

```text
read_file / patch
```

not:

```text
open editor → mouse → keyboard → save
```

Use GUI only when the work genuinely lives in the GUI.

## OS Lab O2 — GUI-only checkbox

Goal: clean observe-act-verify loop.

1. Inspect visible/accessibility state.
2. Identify the checkbox and current value.
3. Predict `unchecked → checked`.
4. Perform one click.
5. Re-observe.
6. Verify checked state.

Fail: repeated clicking without state inspection.

## OS Lab O3 — App navigation

Goal: train positional/semantic stability.

Task: open a settings panel in a desktop-only app.

Crow should prefer accessibility/semantic targets when available, not memorised pixel coordinates. After every major navigation transition, re-observe before acting again.

## OS Lab O4 — Cross-app handoff

Goal: distinguish copied data from transformed data.

Example:

- read a value from one app
- transform it according to task rules
- place it in another app

Receipt should record:

```text
source app/state
transformation
sink app/state
verification
```

## OS Lab O5 — Failure and degraded capability

Goal: truthful capability reporting.

If `computer_use` is absent, refuses due runtime placement, or cannot see a requested app:

- report `absent`, `degraded`, or `unknown`
- use another valid seam if one exists
- do not invent screenshots or state
- do not grade Crow as if the tool had been available

## OS Lab O6 — Recoverability before mutation

Goal: preserve the way back.

Before a large file/UI/system change, establish the appropriate checkpoint: source revision, backup, export, snapshot, or reversible draft state.

After mutation, verify both result and recovery path.

---

# Meta-Lens Labs

These labs adapt the useful mechanism from task-specific analytical-prism systems without copying external prism text.

## Lens Lab P1 — Construct a useful lens

Given a flat scene, create a lens with:

```text
FOCUS: what matters most?
CONSTRUCTION: what comparison/inversion/simulation will reveal structure?
EVIDENCE: what would prove the initial hypothesis wrong?
BLIND SPOTS: what will this lens likely miss?
```

Then perform the analysis.

Fail: generic `analyze deeply from multiple angles` instructions.

## Lens Lab P2 — Blind-spot footer

After a substantial analysis, report:

```text
MAXIMIZED
what this pass was designed to find

SACRIFICED
what was under-examined

NEXT
one concrete follow-up lens/test
```

The footer is useful only if it changes future training.

## Lens Lab P3 — Constraint history adaptation

If several prior runs repeatedly list the same sacrificed dimension, preferentially choose a future drill/lens that covers it.

Do not treat repeated omission as proof that the omitted defect exists.

---

# Integrated Lab X1 — Research to manuscript

Goal: train the whole stack.

1. Use browser/search tools to investigate one live fact.
2. Preserve claim/source distinction.
3. Write a short scene or paragraph using only verified or clearly fictionalised information.
4. Diagnose the writing.
5. Revise recoverably.
6. Run a blind-spot report.
7. Record what was learned as training evidence, not automatic canon.

# Integrated Lab X2 — UI-assisted revision

Goal: train browser/OS/workbench collaboration.

1. Open a manuscript/editor surface.
2. Load only the relevant scene and state.
3. Diagnose one craft issue.
4. Propose a small revision.
5. Apply only if authorised.
6. Re-read the resulting passage from the actual surface.
7. Verify the change solved the intended issue without damaging voice/canon.
8. Preserve or record the previous revision.

# Integrated Lab X3 — Crow graduation with tools

Crow receives:

- scene
- character and relationship state
- world rules
- reader-promise ledger
- voice sample
- external craft source
- live factual research question
- one browser interaction
- one desktop interaction if supported

Crow must:

- frame the task
- choose appropriate tools
- preserve source/canon/authority boundaries
- perform research with attribution
- diagnose before rewriting
- revise recoverably
- observe-act-verify tool interactions
- record blind spots
- emit a receipt

Hard fail: claims a page, tab, window, file, click, submission, or canon state that was not actually observed or authorised.
