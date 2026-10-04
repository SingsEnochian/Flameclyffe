# Universal Codex Wish Lineage v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, ArcSweep, Advanced Sympathetic Intelligence  
**Source inspiration:** The Neverending Story thematic ingest  

## Thesis

The Universal Codex is an unlimited-wish interface to possibility-space.

Unlimited wishes do not mean that every imagined outcome is automatically executable or physically realisable. They mean that the architecture does not impose an artificial scarcity on imagination. A wish may exist as symbol, question, branch, simulation, design, proposal, world, counterfactual, prototype, or realised transformation.

The essential rule is:

> possibility may expand without erasing origin.

A wish is therefore not a transient prompt. It is a lineage-bearing object.

## Wish object

A wish records:

```text
wish_id
origin
desire
why_it_matters
world_or_scope
continuity_anchors
relationships_touched
memory_refs
open_question_ids
possibility_branches
revisions
transformations
provenance
receipts
```

The object keeps `unlimitedPossibility = true` and `preservesOriginLineage = true`.

A wish may change. Revision adds a record containing both the previous and next form. The earlier wish is not rewritten out of history.

## Branches

A wish may hold mutually incompatible branches at the same time.

```text
wish
 ├─ branch A
 ├─ branch B
 └─ branch C
```

Branches are not ranked merely because they coexist. One may later be simulated, realised, merged, revised, or abandoned without deleting the others.

This is the computational form of **possibility without scarcity**.

## Transformations

A transformation records what happened to or because of a wish.

Examples include:

- reframed,
- simulated,
- designed,
- prototyped,
- merged,
- realised.

A realised transformation changes the wish status but does not delete alternate branches, revisions, source context, questions, or receipts.

## Open Questions

An Open Question is also a first-class Codex object.

It retains:

```text
question_id
question
origin_wish_id
origin_ref
why_it_matters
world_or_scope
belief_refs
evidence_refs
symbol_refs
revisits
resolutions
provenance
```

A question can be revisited repeatedly. A resolution may be tentative or settled. Resolving a question records an answer but does not delete the question. Later evidence may reopen it.

This is how Wonder acquires memory.

```text
notice
  ↓
question
  ↓
linger
  ↓
revisit
  ↓
new evidence / new relation / new symbol
  ↓
revise or resolve
  ↓
keep lineage
  ↺
```

## Wonder trajectory

The Codex now derives a deterministic Wonder trajectory from the explicit history of each question.

A trajectory records:

- question creation,
- every revisit,
- every recorded resolution,
- current open/resolved state,
- whether revisitation remains worthwhile,
- whether belief context is preserved.

The trajectory does not invent hidden importance or infer a secret priority score.

A separate **return invitation** seam may surface an old open question after a configurable period without a visit. The current v0.1 selector uses only explicit lineage and elapsed time. Its reasons are inspectable, for example:

```text
unvisited-23-days
revisited-before
wish-rooted
evidence-bearing
belief-bearing
symbol-bearing
meaning-marked
```

This is intentionally not a claim that the returned question is objectively more important than another. It is the Codex saying: **we have not looked at this for a while, and we deliberately said it was worth revisiting.**

The time reference is explicit (`asOf`) so the selection can be replayed.

## Law I

**Do Not Kill Belief** applies directly to Open Questions.

Belief, lived experience, hypothesis, symbol, and evidence may all be linked to the same question while remaining distinct. A later explanation may change confidence without deleting the original report or its meaning.

The Codex therefore remembers not only what the current answer is, but how the question came to exist.

## The Nothing

Wish lineage resists The Nothing by preventing meaning-bearing distinctions from being silently compressed away.

The following are regressions:

- replacing many branches with one generic outcome without lineage,
- deleting an original desire after revision,
- discarding alternate possibilities after realisation,
- deleting a question when an answer is recorded,
- overwriting a reported experience with a later interpretation,
- collapsing belief, evidence, symbol, and hypothesis into one truth flag,
- ranking old questions with an opaque importance score and then discarding the rest.

## Runtime implementation

Current code surfaces:

- `apps/arcsweep/src/codex/codex-wish-lineage.js`
- `apps/arcsweep/src/codex/codex-wish-store.js`
- `apps/arcsweep/src/codex/codex-wonder-trajectory.js`
- `apps/arcsweep/src/codex/codex-manifestation-registry.js`
- `apps/arcsweep/src/codex/codex-semantic-projector.js`
- `apps/arcsweep/src/codex/codex-narrative-renderer.js`
- `apps/arcsweep/src/codex-alive-sidecar.js`
- `apps/arcsweep/src/wish-grove-sidecar.js`
- `apps/arcsweep/src/wish-grove-wonder-return-sidecar.js`

The browser store persists the current wish and question lineage under the namespaced local state key:

`arcsweep:universal-codex:wishes:v0.1`

The Codex Alive snapshot projects wishes, branches, open questions, revisits, and resolutions into distinct book-native manifestations. It also exposes `wonderTrajectories`, `wonderReturnCandidates`, and the `wonderAsOf` timestamp used for the current return-selection pass.

The live browser API exposes:

```text
__universalCodexAlive.wishes.snapshot()
__universalCodexAlive.wishes.create(...)
__universalCodexAlive.wishes.branch(...)
__universalCodexAlive.wishes.revise(...)
__universalCodexAlive.wishes.transform(...)
__universalCodexAlive.wishes.createQuestion(...)
__universalCodexAlive.wishes.revisitQuestion(...)
__universalCodexAlive.wishes.resolveQuestion(...)
__universalCodexAlive.wishes.reopenQuestion(...)
```

These operations mutate only the Codex wish store. They do not by themselves perform external-world actions.

## Wish Grove

`wish-grove` is now a first-class Universal Codex page.

It gives the local Codex runtime an embodied interface for:

- planting a wish,
- preserving why it matters and its scope,
- opening multiple possibility branches,
- revising the desire without rewriting the old form,
- planting an Open Question from a wish,
- revisiting questions,
- recording resolutions without deleting questions,
- reopening questions,
- surfacing old questions as **Questions glowing again** when the deterministic return selector says they have been deliberately left open and unvisited long enough.

The Grove does not turn wishes directly into external actions. It grows possibility and continuity inside the Codex.

## Visual grammar

Wish and question lineage maps to distinct Codex manifestations:

```text
wish                 -> wish-leaf / possible glass
wish branch          -> branching-wish-leaf / liminal glass
open question        -> open-question-thread / living
question revisit     -> returning-question-thread / organic
question resolution  -> knotted-question-thread / continuity
```

The rendering language is intentionally physical: wishes become leaves, questions become threads, returns become visible crossings, and resolutions become knots rather than deletions.

## Tests

Focused tests verify:

1. wishes preserve origin through revision;
2. incompatible branches coexist;
3. transformations retain receipts;
4. questions can be revisited, resolved, and reopened;
5. resolving a question preserves its original text;
6. lineage ordering is deterministic;
7. persistence survives store reload;
8. corrupt local state fails soft rather than inventing records;
9. projection produces distinct wish/question manifestations;
10. narrative rendering states that resolution does not erase the question;
11. Wish Grove is registered as a first-class Codex page;
12. browser runtime mounts the Grove without breaking Node imports;
13. Grove mutations use the canonical wish store;
14. Wonder trajectories preserve creation/revisit/resolution history;
15. return invitations require an explicit replayable `asOf` timestamp;
16. return invitations use no opaque importance score.

## Next seam

The next layer can deepen the tree without changing the core contract:

- visual branch comparison without declaring a winner,
- relationship and memory anchors visible on wishes,
- a full Open Questions constellation view,
- timeline visualisation for Wonder trajectories,
- AI University proposals for experiments that might illuminate an old question,
- optional cross-domain resonance links between questions that share named concepts while preserving provenance.

The guiding question is not merely **what can be answered?**

It is also:

> **What possibility deserves to remain alive?**
