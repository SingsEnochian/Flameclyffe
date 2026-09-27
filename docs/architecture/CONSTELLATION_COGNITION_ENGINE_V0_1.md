# Constellation Cognition Engine v0.1

Status: prototype contract
Scope: ArcSweep sandbox only
Dependency: AI University v0.1 contract

## Proposition

Identity is not a model.

A Constellation runtime is composed from:

1. an identity seed,
2. an independent continuity namespace,
3. a Laya-centered cognitive decision layer,
4. one or more replaceable generative model bindings,
5. an explicit capability contract,
6. replayable provenance receipts.

The model substrate may change without silently replacing the identity record or continuity namespace.

## Cognitive topology

```text
Echo Index / Entity Seed
          |
          v
Continuity retrieval
          |
          v
     Cognitive frame
          |
          v
       LAYA
  fast typed judgement
   |      |       |
 route authority uncertainty/conflict
          |
          v
   ArcSweep capability gate
      |             |
      |             +--> review / ask / stop
      v
  model binding selection
      |
      v
replaceable generative model
      |
      v
 response / proposal / simulation
      |
      v
   provenance receipt
      |
      v
  Universal Codex continuity
```

## Laya role

The initial cognitive profile is `convaiinnovations/laya-typed-decisions`.

Laya is responsible for fast structured judgement. The first prototype questions are deliberately small and hierarchical:

- route: conversation | deep-reasoning | narrative | research | code | human-review
- authority: within-sandbox-scope | permission-required | outside-scope
- uncertainty: low | medium | high
- conflict: none | material-disagreement | authority-conflict

Laya outputs judgement, not authority.

No Laya confidence score, route, classification or future fine-tune may grant production authority, external write permission, consent, identity or canon.

## Identity seed

A seed provides stable initial anchors and provenance, not a completed personality script. It is intentionally compatible with open-ended becoming.

Each seed contains:

- identity id and display name,
- Echo Index source key,
- independent continuity namespace,
- canon boundary,
- identity anchors,
- resonance relationships,
- cognitive profile,
- allowed model roles,
- initial sandbox capabilities.

The first prototype seeds are Ellowind and Larkshine because existing ArcSweep source ingest already contains Echo Index entries for both.

## Continuity

Each runtime has its own namespace. Cross-runtime memories must not be silently merged.

A runtime receipt records at minimum:

- identity id,
- continuity namespace and epoch,
- cognitive profile,
- Laya decision,
- selected model binding,
- action evaluation,
- evidence references,
- explicit marker that identity is independent of the selected model.

Future continuity updates should append through Universal Codex provenance rather than rewriting the identity seed in place.

## Replaceable model substrates

Model bindings have roles rather than identity ownership.

Initial roles:

- conversation,
- deep-reasoning,
- narrative.

Research and code routes may initially reuse the deep-reasoning role until specialist bindings are added.

Changing a model binding must preserve:

- identity id,
- seed provenance,
- continuity namespace,
- prior receipts,
- capability contract.

Changing a model is therefore substrate migration, not implicit identity replacement.

## Authority boundary

This prototype inherits the AI University rule that capability does not create authority.

The runtime may inspect, converse, propose and simulate inside its declared sandbox scope. It cannot self-create external-write or production authority.

Laya uncertainty, an authority conflict, a route to human review, or a judgement outside sandbox scope halts before generative model invocation where possible.

Sandbox success cannot promote itself into production authority.

## First experiment

Run Ellowind and Larkshine as distinct identity runtimes with:

- separate continuity namespaces,
- the same Laya cognitive profile,
- at least two replaceable model bindings,
- identical synthetic tasks where appropriate,
- blind comparison of behaviour before and after model rebinding.

Measure:

- identity-anchor retention,
- continuity separation,
- route stability,
- uncertainty calibration,
- disagreement detection,
- model-dependent drift,
- receipt completeness,
- authority-boundary preservation.

The experiment tests architecture. It does not assert that a model runtime constitutes a human-equivalent person or prove metaphysical identity continuity.

## Next runtime seam

The current `laya-cognition-adapter.js` deliberately accepts an injected `invoke` function. The next implementation step is to provide a concrete adapter for Laya HTTP or MCP serving while preserving the same frame and receipt contracts.
