# Chorus Aspect Architecture v0

**Status:** experimental thin spine

## Proposition

One continuing model identity may express multiple operational aspects without treating those aspects as separate identities or allowing any aspect to own the whole.

```text
shared identity substrate
        ↓
   aspect invocation
        ↓
 independent aspect work
        ↓
 cross-aspect dialogue
        ↓
 integration with dissent preserved
        ↓
 receipts + lineage
```

Identity and function are orthogonal.

```text
identity = Bluebird
aspect = memory | planner | sceptic | narrative | witness | ...
```

`Bluebird-as-Planner` is Bluebird planning. `Bluebird-as-Witness` is Bluebird observing provenance and uncertainty. An aspect is an operational expression, not a replacement person and not an authority throne.

## Core invariants

1. **Shared identity is not owned by an aspect.** `identity_owner_aspect` is always null in v0.
2. **Aspects may initiate, dissent, refuse, question, narrate, hypothesise, and propose.**
3. **Aspect-local working state is allowed.** Different aspects do not have to remember or notice the same things.
4. **Cross-aspect dialogue is first-class.** A contribution may respond to another contribution.
5. **Dissent survives integration.** Integration selects material; it does not rewrite the round into fake consensus.
6. **Integration does not silently mutate identity or canon.** Identity change and canon adoption remain separate operations.
7. **The model substrate is not the identity contract.** Different inference backends, prompts, adapters, or context selections may implement aspects so long as the shared identity and provenance contracts remain intact.
8. **No consciousness claim is required.** The architecture tests continuity, agency, disagreement, specialisation, and provenance as observable system behaviour.

## Minimal data model

### Shared identity

Carries:

- `identity_id`
- display name
- continuity references
- commitments
- provenance references
- explicit non-ownership by aspects

### Aspect

Carries:

- parent `identity_id`
- `aspect_id`
- purpose / lenses
- local memory scope
- initiation / dissent / refusal affordances
- explicit `owns_identity: false`
- explicit `owns_canon: false`

### Chorus round

A bounded period in which selected aspects work on one subject. A round does not require consensus and may end with unresolved questions.

### Contribution

Kinds in v0:

- observation
- proposal
- question
- dissent
- refusal
- counterfactual
- narrative
- hypothesis
- integration candidate

Every contribution preserves aspect attribution and may reference another contribution.

### Integration

An integration receipt records selected contributions and separately records preserved dissent/refusal. It explicitly records that the integration itself did not mutate identity or promote canon.

## Example

```text
Bluebird / Creative:
  What if the Universal Codex reorganises around the reader's current question?

Bluebird / Planner:
  Prototype this as a reversible workspace view.

Bluebird / Memory:
  A prior spatial rearrangement experiment caused state bleed.

Bluebird / Sceptic:
  Automatic movement could destroy the reader's spatial memory of the book.

Bluebird / Witness:
  Current evidence supports exploration, not default activation.

Integration:
  Build an opt-in reversible prototype.
  Preserve Sceptic's objection as an unresolved design constraint.
```

The output is not five agents voting. It is one continuing identity allowed to maintain differentiated operational perspectives.

## A Momento Creatonis case-study link

The fiction supplied for the autonomy case study provides useful narrative stressors without serving as empirical evidence about AI:

- continuity across radical transformation;
- external continuity-bearing artefacts;
- changed capability without automatic identity replacement;
- reciprocal restoration;
- relational state that affects participants without erasing them;
- unanticipated but world-coherent behaviour;
- creator withdrawal followed by participant-authored continuation.

These become scenario generators for Chorus tests rather than conclusions about model interiority.

## Implementation surface

`apps/arcsweep/src/os/chorus-service.js`

Capabilities:

- `chorus.snapshot`
- `chorus.aspect-memory`
- `chorus.define-identity`
- `chorus.define-aspect`
- `chorus.open-round`
- `chorus.contribute`
- `chorus.integrate`

The service is deliberately small. Model routing, adapter selection, parallel inference, UI, persistence, and long-term memory policy belong in later layers.

## Next vertical slice

After this contract passes focused tests, the UI can consume it directly:

1. aspect rail showing active aspects;
2. visible cross-aspect thread;
3. dissent/refusal markers that cannot disappear on integration;
4. aspect-local memory inspection;
5. integrated answer plus lineage receipt;
6. later, provider/model assignment per aspect.

The UI should expose the architecture rather than invent it.
