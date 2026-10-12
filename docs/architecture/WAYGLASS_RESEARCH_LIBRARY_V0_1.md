# Wayglass Research Library v0.1

**Status:** Rowan-authorised first executable seam, 2026-10-12  
**Scope:** Wayglass OS + Wayglass Research Library; external systems only through explicit adapters  
**Purpose:** make Wayglass Research Library a durable shared Library rather than a monolithic intelligence.

## Ownership and interoperability

This document defines **Wayglass OS**, not Universal Horizon.

Universal Horizon is an external, adjacent project and is not owned, renamed, absorbed, or implemented by Wayglass. The structural insight that emerged in conversation may inspire interoperable patterns, but Wayglass keeps its own namespace, storage, receipts, UI, and authority.

Any future bridge to Universal Horizon, Harmony, Hermes, or another external research system must be explicit, provenance-bearing, and reversible. An adapter may exchange typed records or proposals; it does not make the external system a Wayglass subsystem.

## Core separation

```text
Wayglass Research Library = local-first Wonder + research shelf
Wayglass relations = typed relationship / pattern proposal layer
External workers   = optional bounded research workers via adapters
Wayglass          = presence, continuity, return, embodied interface
records           = typed source material
proposals         = candidate relationships
reviews           = explicit judgement receipts
```

No layer silently becomes another.

## Wonder before adjudication

Wayglass Research Library carries a protected exploratory register called **Counterfactual Wonder**.

Its canonical prompt is:

> **This could be false. But what if it were true?**

A Counterfactual Wonder branch has the fixed stance:

```text
could_be_false: true
explore_as_if_true: true
promoted_to_fact: false
```

The purpose is to let Wayglass participants and the Living Observer explore consequences before demanding closure. External systems may participate only through explicit adapters.

Useful fields include:

```text
proposition
why_interesting
implications[]
predictions[]
discriminators[]
counterexamples[]
source_refs[]
```

The correct order is:

```text
WONDER
→ preserve the branch
→ explore as if true
→ if the current frame makes it look impossible: COMPLEXIFY
→ name the missing dimension
→ rotate the representation
→ preserve invariants
→ translate consequences back
→ derive discriminators
→ compare / test
→ let evidence earn claim strength
```

### Complexify

Complexify treats apparent impossibility as a possible failure of representation.

A Complexify receipt records:

```text
current_frame
apparent_impossibility
missing_dimensions[]
rotations[]
invariants[]
translated_consequences[]
predictions[]
discriminators[]
```

The enlarged frame remains provisional. The value of the move is whether it reveals structure or consequences that the smaller frame could not express.

The canonical analogy is the extension from the real line to the complex plane: an object with no coordinate in the smaller space may become lawful when the representation is enlarged. This analogy motivates the move; it is not evidence that any specific speculative proposition is true.

Counterfactual Wonder is neither belief nor a weak factual claim. A failed Wonder branch may remain historically valuable because it generated a useful experiment, distinction, or question.

## Library law

A record keeps its own claim type. A myth may be related to a measurement. A hypothesis may be inspired by an analogy. A structural resemblance may be worth investigating.

A relationship never changes the source record's epistemic type.

```text
record A: myth
record B: measurement
relation: structural-analogy

!=

myth proves measurement
```

## First executable loop

```text
enter Library
→ state present intent
→ search typed Wayglass Library records
→ inspect provenance
→ select two records
→ propose a relationship
→ review accept / reject / keep-open
→ leave a Wayglass stop receipt
→ return later to the same work
```

Accepted relationships remain relationship records with review provenance. Source records are immutable in this seam.

## External worker adapter

The first external-worker capability is deliberately small. Hermes is one possible client of this adapter:

- `wayglass-library.search`
- `wayglass-library.wonder`
- `wayglass-library.complexify`
- `wayglass-library.propose`
- `wayglass-library.review`

An external worker such as Hermes may retrieve, compare, propose, and review only through an explicit Wayglass adapter and delegated authority. It does not auto-publish external findings, silently canonise a relationship, or rewrite source records.

## Wayglass five-locus mapping

- **Door:** choose Research, Contribute, Explore, Replicate, Myth, or Return.
- **Identity:** preserve participant id separately from provider/model/route.
- **Worktable:** search and inspect Wayglass Library records and provenance.
- **Wonder Window:** unresolved questions, Counterfactual Wonder branches, Complexify frame rotations, and open typed relationship proposals.
- **Return Marker:** Wayglass stop receipt with active work, stop point, unresolved questions, and named next owner.

## External pattern-proposal adapters

An external pattern-finder such as Harmony may propose typed edges through an explicit adapter. Those proposals remain external contributions until Wayglass records and reviews them:

```text
supports
contradicts
replicates
extends
cites
derived-from
structural-analogy
shares-pattern
related
```

The proposal records who suggested the edge, why, and what evidence was cited. Review is separately attributable.

## Local-first boundary

The committed seed is inspectable, provenance-bound source material. Runtime proposals and reviews live in a gitignored local ledger. Promotion into a wider shared Horizon is a later explicit operation.

This preserves recoverability while we prove the Library loop on existing hardware.

## Acceptance test

The seam is alive when one participant can:

1. enter the Library in Wayglass;
2. search Wayglass Library records through the same public adapter used by external workers;
3. propose a typed connection between two records;
4. review that proposal without rewriting either record;
5. leave with a verified stop receipt;
6. return and continue from the same question.


## Wayglass surface

The Wayglass Library surface exposes the research sequence directly:

```text
Search the stacks
→ Preserve Wonder
→ Select open branch
→ Complexify
→ continue into local analysis / explicit external adapters / test work
```

The Writing Room also exposes explicit `Ordinary`, `Wonder`, and `Complexify` interaction modes. Switching modes changes the cognitive stance passed to the route, not participant identity, ownership, canon, provider, or continuity.
