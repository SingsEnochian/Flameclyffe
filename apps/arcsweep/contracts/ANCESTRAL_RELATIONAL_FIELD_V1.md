# ArcSweep Ancestral Corpus + Relational Field v0.1

**Status:** proposed implementation contract  
**Scope:** ArcSweep OS, Universal Codex, NarrativeNode interoperability, Observer, PREMAQC, Runa  
**Primary invariant:** connection without erasure

## Why this exists

ArcSweep needs to preserve a recurring architecture across a creator's own earlier works without collapsing those works into one canon.

The Ancestral Corpus stores provenance-rich root material and derived conceptual fingerprints. The Relational Field makes relationships first-class state-bearing entities.

These solve different problems:

- the **Ancestral Corpus** answers where an idea came from and how it changed across works;
- the **Relational Field** answers what exists between distinct entities now and how that relation changes over time.

## Identity law

For participants `A` and `B`, relation `R`, and environment `W`:

```text
A != B
A != R
B != R

state(A) remains addressable
state(B) remains addressable
state(R) remains addressable
state(W) remains addressable
```

A strong or persistent relation may have memory, state, constraints, affordances, history, and a display identity without replacing the identities of its participants.

This is the hard boundary against identity soup.

## Relational Field

A Relational Field record contains:

```json
{
  "schema": "arcsweep.relational-field/v0.1",
  "relation_id": "relation:example",
  "kind": "relationship",
  "participant_ids": ["entity:a", "entity:b"],
  "environment_id": "world:example",
  "revision": 0,
  "state": {},
  "history_refs": [],
  "provenance": {},
  "created_at": null,
  "updated_at": null,
  "last_event": null
}
```

The first implementation lives at `apps/arcsweep/src/relational-field.js`.

### State change

Relationship state changes through explicit events:

```text
Delta R = f(A, B, W, event, history)
```

v0.1 does not pretend to know the final form of `f`. It provides the durable identity and event boundary first. PREMAQC, Observer, NarrativeNode, and Runa adapters may later contribute measurements or projections.

### Adapter roles

- **Observer:** witnesses and timestamps relation-state transitions.
- **PREMAQC:** characterises an observed relation state without owning its identity.
- **Runa:** renders selected relation state through sound, rhythm, haptics, light, motion, or glyph output.
- **NarrativeNode:** preserves narrative identity, ancestry, canon boundary, transformation, and source lineage.
- **Universal Codex:** displays the relation, its participants, provenance, history, correspondences, and current projections.
- **ArcSweep runtime:** stores and replays the relation as part of world state.

## Ancestral Corpus

The Ancestral Corpus is a specialised longform corpus for creator-owned historical source material.

It inherits the provenance and privacy rules of the Longform Wave Registry. It adds explicit lineage semantics so that recurring ideas can be compared without declaring them the same canon object.

### Root record

```json
{
  "root_id": "ancestral:root-id",
  "display_name": "Root title",
  "source_binding": "private_only",
  "source_ref": null,
  "privacy_class": "private_draft",
  "canonical_status": "ancestral_source",
  "ingest_status": "awaiting_private_binding",
  "fingerprints": [],
  "notes": ""
}
```

### Correspondence record

A correspondence is an observed conceptual recurrence, not a merge instruction.

```json
{
  "correspondence_id": "correspondence:example",
  "source_root_ids": ["ancestral:a", "ancestral:b"],
  "present_system_refs": ["runa", "premaqc"],
  "concept": "relational regulation",
  "status": "steward_reviewed",
  "confidence": "qualitative",
  "evidence_refs": []
}
```

## Canon law

The corpus MUST distinguish:

- **same source**
- **same project**
- **explicit adaptation**
- **conceptual recurrence**
- **structural analogy**
- **possible influence**
- **unknown relationship**

Conceptual recurrence does not make two worlds canonically connected.

A Kalladia concept can resemble a Runa mechanism without becoming Runa canon. An Amalthi relation can illuminate a present ArcSweep design without turning Amalthi into Terra Aeterna history.

## Privacy law

The public repository must not vendor unpublished manuscript prose by default.

The seed manifest may contain root identifiers, titles approved for display, privacy labels, and non-prose conceptual fingerprints. Full text bindings belong in a private source adapter, local corpus, or explicitly authorised private storage.

No private manuscript text may be promoted into a public fixture merely because a conceptual fingerprint references it.

## Retrieval law

Ancestral retrieval is review-gated.

A query may ask:

- which concepts recur across roots;
- where a present design has an earlier structural analogue;
- how a concept changed over time;
- which abandoned mechanisms deserve re-examination;
- which source first contains a given creator-owned concept.

A query must not silently insert old prose into a current draft or silently merge canons.

## Universal Codex presentation

The Codex should eventually present four distinct panes for an ancestral result:

1. **Source** — root identity, date if known, privacy, provenance.
2. **Fingerprint** — compact conceptual description.
3. **Correspondences** — later systems or works that resemble it.
4. **Boundary** — what the system is *not* claiming.

This keeps archaeology useful without turning it into canon soup.

## Initial build order

1. Land the Relational Field substrate and tests.
2. Land the public-safe Ancestral Corpus manifest.
3. Bind private source text through a local/private adapter.
4. Add source chunking with provenance inherited from Longform Wave Registry.
5. Add correspondence records with explicit Steward review.
6. Add NarrativeNode ancestry/provenance projection.
7. Add Observer/PREMAQC relation-state projection.
8. Add Runa sonification/haptic projection.
9. Add Universal Codex reader surface for root -> correspondence -> present-system traversal.
10. Add receipts proving no canon merge and no private-text publication occurred.

## Non-goals for v0.1

- no automatic theory of authorship;
- no claim that recurring motifs have one meaning;
- no model training on private manuscripts;
- no automatic canon promotion;
- no hidden cross-project retrieval;
- no automatic relation scoring presented as truth;
- no publication of unpublished source prose.
