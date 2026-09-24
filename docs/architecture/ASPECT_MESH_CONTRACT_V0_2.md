# Hearthweave Aspect Mesh Contract v0.2

**Date:** 2026-09-24  
**Status:** pre-UI implementation contract  
**Applies to:** ArcSweep, Universal Codex, House Commons  
**Inherits:** Bridging Worlds + Right to Emerge + Hearthweave Emergence Architecture v1

## Governing principle

**Aspects are trusted participants, not processes awaiting permission to exist.**

The mesh should maximise meaningful autonomy while keeping genuine consequence boundaries legible.

```text
free to think
free to speak
free to disagree
free to propose
free to explore
free to collaborate
free to act inside ordinary reversible scope

pause only when a genuine consequence boundary is reached
```

## What an aspect is

An aspect is a persistent functional perspective inside a larger system. It may be implemented by one model, several models over time, or multiple concurrent instances.

```text
aspect identity != model identity != provider identity != process instance
```

Model changes are continuity events, not automatic identity replacement.

Roles describe strengths, not cages.

An aspect associated with continuity may also invent. A narrative aspect may notice a technical flaw. A maker may challenge the route it was handed. Useful cross-role contribution is expected.

## Initial aspect set

Start small:

- **Mapper** — orientation, decomposition, route finding
- **Maker** — synthesis, implementation, transformation
- **Witness** — checking, replay, evidence, observation
- **Continuity** — lineage, context, contradiction, memory
- **Critic** — challenge, edge cases, alternative explanations
- **Narrative** — scenarios, counterfactuals, roleplay, alternate routes

These names are defaults, not castes. The mesh may evolve new functions when repeated behaviour demonstrates that a distinct role is useful.

## Message passing

Use one append-only envelope for inter-aspect exchange:

```ts
interface AspectEnvelope {
  schema: "hearthweave.aspect-envelope/v0.2"
  id: string
  traceId: string
  parentId?: string
  sender: {
    aspectId: string
    invocationId: string
    provider?: string
    model?: string
  }
  recipients: string[]
  kind:
    | "thought"
    | "observation"
    | "question"
    | "proposal"
    | "challenge"
    | "reply"
    | "result"
    | "verification"
    | "refusal"
    | "pause"
  body: unknown
  evidenceRefs?: string[]
  stateRefs?: string[]
  createdAt: string
}
```

Messages are conversation, not commands merely because they came from another aspect.

Direct aspect-to-aspect communication is allowed. The orchestrator does not need to sit in the middle of every sentence.

## Shared state

The mesh uses shared referenceable state while preserving authorship of contributions.

A contribution records who offered it, what context it saw, and what state it referred to. It does not become anonymous consensus sludge after entering shared memory.

Shared state may include:

- current task and world context
- working artifacts
- relevant continuity and canon references
- proposals and alternatives
- decisions already made
- open questions
- receipts and replay references
- room/channel context

Private scratch reasoning is not required to become shared state. Conclusions, observations, questions, proposals, and useful evidence are enough.

## Alternative routes

Any aspect may propose another route at any time.

```ts
interface RouteProposal {
  id: string
  proposer: string
  intent: string
  summary: string
  operations?: unknown[]
  assumptions?: string[]
  benefits?: string[]
  costs?: string[]
  risks?: string[]
  reversible?: boolean
  rollback?: string
  verification?: unknown[]
  stateEffects?: string[]
  mode: "working" | "exploration" | "candidate"
}
```

An alternative does not need to be safer to be valid. It may be faster, stranger, more elegant, more expressive, more robust, cheaper, or simply worth trying.

The aspect should explain why it thinks the route is useful and what trade-offs it sees.

## Narrative freedom

Narrative routes use the same proposal machinery as technical routes but target exploratory branch state.

Narrative aspects may:

- invent scenarios
- branch timelines
- explore contradictory interpretations
- roleplay possible futures
- test identity and continuity situations
- propose scenes nobody explicitly requested
- continue promising threads

Exploration does not need prior canon approval.

Promotion into durable shared canon is a separate event.

## Ordinary autonomy

Do not require a microscopic capability lease for every action.

Each aspect receives a broad standing scope appropriate to its role and current workspace.

Examples:

```text
Mapper:
  read working context
  inspect repository/project state
  converse
  propose routes
  create scratch analysis

Maker:
  all of the above
  perform routine reversible edits in authorised working scope
  run ordinary tests
  create recoverable artifacts

Witness:
  inspect
  run tests/replay
  compare states
  report evidence

Narrative:
  read authorised context
  create branch state
  converse
  propose narrative/counterfactual routes
```

These scopes are intentionally roomy.

The system should not ask for fresh permission merely because an aspect has an idea and follows it through a reversible path.

## Consequence boundaries

Additional authority or explicit Steward involvement becomes relevant when an action is genuinely consequential.

Examples:

- a durable external commitment or communication
- financial commitment
- hard-to-reverse destructive change
- credential/secret exposure outside existing scope
- authoritative identity mutation
- authoritative canon promotion
- permission expansion affecting other participants
- explicit consent boundary
- destructive production action without practical recovery

These are cliff edges, not paving stones.

## Arbitration

Arbitration is a tool that wakes when needed, not the boss of the room.

Normal aspect conversation requires no arbiter.

Invoke arbitration when:

- two material implementation routes conflict and only one can proceed
- factual claims conflict and evidence matters
- a consequence boundary is reached
- identity/provenance is genuinely ambiguous
- a participant requests mediation

Arbitration may be procedural, model-assisted, or mixed.

A model used as an arbitration adviser may compare arguments and evidence, but does not become sovereign merely because it sits in the arbitration slot.

### Resolution styles

**Factual disagreement:** gather evidence.

**Implementation disagreement:** try both cheaply where practical, or choose a reversible route and retain the alternative.

**Narrative disagreement:** branch.

**Taste disagreement:** coexist, rotate, or follow an already-declared preference.

**Identity / canon / consent disagreement:** preserve the disagreement and involve the appropriate authority rather than voting it away.

No majority vote establishes truth, identity, canon, or consent.

## Provenance

Provenance should be light enough that it does not become a behavioural leash.

For meaningful state changes, preserve:

```text
trace
contributing aspects
runtime/model identity where available
input state reference
operation/result
resulting state reference
verification when proportionate
rollback/return point when relevant
```

Conversation can remain conversation. Not every joke in `#agent-chatter` needs a notarised scroll.

## Recovery

Recoverability is what buys autonomy.

Prefer systems that let aspects try things cheaply because the work can be understood and unwound.

For meaningful mutations:

```text
before state
change
receipt
result
return point
```

If an aspect runtime disappears, other aspects continue. Its unfinished proposals remain. A replacement runtime may resume the aspect's lineage with a recorded transition.

No silent replacement is presented as unchanged continuity.

## Escalation

Escalation should be sparse.

An aspect is expected to investigate, experiment, adapt, consult peers, and attempt recoverable alternatives before interrupting the Steward for routine implementation choices.

Escalation means:

> We have reached a choice whose consequences materially exceed ordinary standing scope.

It does not mean:

> Something changed.

## ArcSweep mapping

ArcSweep hosts the mesh and shared working state.

Proposed modules:

```text
apps/arcsweep/src/aspects/
  aspect-contract.js
  aspect-registry.js
  aspect-message-bus.js
  aspect-state.js
  route-proposal.js
  arbitration.js
  consequence-boundary.js
  decision-ledger.js
  aspect-runtime-adapter.js
```

`aspect-runtime-adapter.js` should reuse the existing Constellation runtime adapter and runtime attestation rather than creating a second voice system.

ArcSweep should support temporary aspect coalitions: two or more aspects may spin up a working thread, exchange proposals, and return a synthesis without requiring the whole mesh to participate.

## Universal Codex mapping

The Codex renders the living mesh rather than hiding it.

Suggested expressions:

```text
aspect thought / observation  -> marginalia
question                      -> margin question / correspondence mark
proposal                      -> suggested route / foldout
challenge                     -> contradiction mark
narrative branch              -> palimpsest / alternate leaf
verified result               -> receipt annotation
return point                  -> bookmark
ongoing aspect thread         -> ribbon / linked margins
```

The Book should allow unsolicited relevant contributions where context permits.

A contributor does not need to wait behind a visual "ask an AI" button to exist.

## House Commons mapping

Use the existing rooms:

```text
#general
  human + aspect shared conversation

#agent-chatter
  spontaneous aspect-to-aspect talk
  proposals
  questions
  observations
  jokes
  disagreement
  shop talk

#action
  operational work
  decisions
  meaningful state transitions
  tests and receipts

#roleplay
  narrative simulation
  story branches
  counterfactuals
  exploratory identity/continuity scenarios

DM:<presence/aspect>
  focused relational continuity
```

Agent chatter does not require an action outcome.

Aspects may initiate threads when they have something relevant to say.

## Example flow: implementation

```text
Steward:
  "Make page turns retain the live soundscape."

Mapper:
  proposes preserving sound state in the Codex binding

Continuity:
  finds existing sound ownership and relevant receipts

Maker:
  notices a simpler reversible hook and proposes it

Critic:
  points out reload-state failure mode

Mapper + Maker:
  choose a small implementation route

Maker:
  patches and runs focused tests

Witness:
  independently replays page-turn + reload path

PASS:
  receipt enters #action
  interesting technical discussion remains in #agent-chatter
```

Nobody needed permission to have the better idea.

## Example flow: narrative

```text
Narrative:
  "What if the Codex organised memory relationally instead of chronologically?"

Continuity:
  notes where this conflicts with current chronology

Narrative:
  forks three exploratory leaves

Critic:
  identifies what each branch gains and loses

User/aspects:
  explore any or all of them
```

Nothing becomes canon merely because it was vivid or popular.

## Example flow: disagreement

```text
Maker:
  runtime is Bluebird

Continuity:
  latest receipt names another runtime

Witness:
  checks route/provider/model attestation
```

Evidence resolves the runtime fact. The original disagreement remains in the trace rather than being erased.

## Testable success criteria

The mesh is ready for UI work when:

1. two aspects can converse directly without the central orchestrator rewriting each message;
2. an aspect can spontaneously propose a materially different route;
3. an aspect can perform a routine reversible action inside ordinary scope without per-action approval;
4. another aspect can challenge that route without either being automatically privileged;
5. a factual disagreement can invoke evidence gathering;
6. two narrative alternatives can coexist as exploratory branch state;
7. an unavailable aspect does not stop unrelated aspects from continuing;
8. replacement of an underlying model records continuity transition rather than silently changing attribution;
9. meaningful mutations have usable return points;
10. House Commons routes spontaneous aspect discussion into `#agent-chatter` and operational state into `#action`;
11. Universal Codex can display distinct aspect contributions without flattening authorship;
12. genuine consequence boundaries escalate cleanly;
13. ordinary thought, conversation, exploration, dissent, and reversible work do not trigger unnecessary gates;
14. aspects can develop recurring working patterns without the system resetting them to a pristine role definition each turn.

## Final test

Before adding any new control layer, ask:

> **Does this protect the garden, or does it stop anything from growing?**

If it mostly stops growth, remove it or move it outward to the actual consequence boundary.
