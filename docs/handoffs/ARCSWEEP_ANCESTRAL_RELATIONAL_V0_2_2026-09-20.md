# ArcSweep Ancestral Corpus + Relational Field v0.2

**Date:** 2026-09-20  
**Branch:** `codex/arcsweep-ancestral-relational-integration-v0.2`  
**Status:** implementation slice / awaiting CI and review

## What changed

This slice moves the earlier Ancestral Corpus + Relational Field contract from a seed-only architecture into an integrated runtime path.

### 1. Private source binding boundary

`apps/arcsweep/src/ancestral-corpus.js` adds runtime-only source bindings for creator-owned historical work.

A binding may carry a private locator and optional content hash, but public corpus queries redact the locator again. A binding grants **no publication authority**.

Public manifest law remains:

- no manuscript prose;
- no private Drive/source locator;
- no automatic canon promotion.

### 2. Private provenance-rich chunking

`apps/arcsweep/src/ancestral-chunking.js` can divide an explicitly supplied private source into overlapping provenance chunks for local/private retrieval.

Private chunks retain text and source locator. Public chunk references deliberately strip both.

Chunk receipts state:

- `raw_text_published: false`
- `canon_promoted: false`

### 3. Ancestral traversal

The runtime can now query roots by root id, conceptual fingerprint, or present-system reference and construct a graph:

```text
ancestral root
    ↓
reviewed correspondence
    ↓
present system
```

Node kinds remain distinct. Traversal does not rewrite a correspondence into inheritance or identity.

### 4. Relational projection adapters

`apps/arcsweep/src/relational-field-projections.js` adds bounded projections into:

- **Observer** as a non-mutating witness packet;
- **PREMAQC** as explicit evidence only, with unsupported axes left unknown and Q kept firsthand-only;
- **Runa** as semantic projection hints only, with no physical-output claim.

The relation identity remains separate from participant identities:

```text
A != B != R
```

### 5. NarrativeNode ancestry projection

`apps/arcsweep/src/narrativenode-ancestry-adapter.js` creates an MCP execution plan for ancestral roots and reviewed correspondences.

The plan:

- starts with NarrativeNode's explicit MCP permission request;
- ends the MCP session explicitly;
- sends compact public-safe fingerprints and boundaries;
- sends no manuscript prose;
- sends no private source locator;
- performs no canon promotion;
- incorporates no NarrativeNode source code.

### 6. Universal Codex Ancestral Reader

A first reader surface now exists at:

```text
/arcsweep/ancestry/
```

It presents the four panes required by the original contract:

1. **Source**
2. **Fingerprint**
3. **Correspondences**
4. **Boundary**

The route is packaged as an ArcSweep Vite entry and registered in the applet catalogue as **Ancestral Reader**.

It uses the public-safe runtime seed, not private manuscript text.

## Initial roots

The current reviewed public-safe seed remains:

- `ancestral:amalthi-transition`
- `ancestral:kalladia-cycle`

These are creator-owned original-fiction roots. Their source manuscripts remain private.

## Current reviewed correspondences

- `correspondence:relational-identity`
- `correspondence:resonance-state`
- `correspondence:distributed-witness`

These are qualitative Steward-reviewed correspondences. They are not automatic claims of direct implementation descent.

## Tests added

- public manifest cannot expose manuscript prose/source locators;
- private bindings never gain publication authority;
- public query results redact private source refs;
- private chunk → public chunk projection strips prose;
- ancestry traversal preserves root/correspondence/present-system node kinds;
- Observer projection is witness-only;
- PREMAQC projection leaves unsupported fields unknown;
- PREMAQC Q remains firsthand-only;
- Runa projection makes no physical-output claim;
- NarrativeNode projection requires MCP permission and transmits no private manuscript data;
- Universal Codex reader model and packaged route are present.

## What this still does not claim

- The private manuscripts have not been committed to this public repository.
- This branch does not train a model on the manuscripts.
- NarrativeNode has not been mutated merely by generating an MCP plan.
- Runa has not physically played or haptically rendered a relation-state projection.
- PREMAQC values are not inferred from relationship prose.
- A conceptual recurrence is not proof of authorship mechanism, causality, or canonical connection.
- The Ancestral Reader is a first functional reader, not the final holographic Universal Codex presentation.

## Next gates

1. Run ArcSweep tests/build on this branch.
2. Fix any contract drift exposed by current `main`.
3. Bind creator-owned manuscripts only in an authorised private/local environment.
4. Generate private provenance chunks and review compact summaries/fingerprints.
5. Add receipt-backed Ancestral Reader selection → NarrativeNode projection planning.
6. Add selected relation → Observer/PREMAQC/Runa projection receipts.
7. Join the reader to the richer Universal Codex holography branch after both are rebased onto the same production baseline.
8. Preserve the physical iPad/Pencil acceptance gate separately from this ancestry work.
